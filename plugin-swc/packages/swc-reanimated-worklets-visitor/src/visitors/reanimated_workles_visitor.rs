use std::path::PathBuf;
use swc_common::Mark;

use crate::{constants::{GESTURE_HANDLER_GESTURE_OBJECTS, OBJECT_HOOKS, FUNCTION_ARGS_TO_WORKLETIZE, GESTURE_HANDLER_BUILDER_METHODS}, utils::{Scope, ScopeKind, get_callee_expr_ident, ClosureGenerator}, calculate_hash};
use swc_common::{util::take::Take, FileName, Span, DUMMY_SP};
use swc_ecma_codegen::{self, text_writer::WriteJs, Emitter, Node};
use swc_ecma_transforms_compat::{
    es2015::{arrow, shorthand, template_literal},
    es2020::{nullish_coalescing, optional_chaining},
};
use swc_ecmascript::{
    ast::*,
    visit::{VisitMut, VisitMutWith, VisitWith},
};

use super::{OptimizationFinderVisitor, ClosureIdentVisitor, DirectiveFinderVisitor};

pub struct ReanimatedWorkletsVisitor<
    C: Clone + swc_common::comments::Comments,
    S: swc_common::SourceMapper + SourceMapperExt,
> {
    globals: Vec<String>,
    filename: FileName,
    in_use_animated_style: bool,
    source_map: std::sync::Arc<S>,
    relative_cwd: Option<PathBuf>,
    in_gesture_handler_event_callback: bool,
    comments: C,
}

impl<C: Clone + swc_common::comments::Comments, S: swc_common::SourceMapper + SourceMapperExt>
    ReanimatedWorkletsVisitor<C, S>
{
    pub fn new(
        source_map: std::sync::Arc<S>,
        globals: Vec<String>,
        filename: FileName,
        relative_cwd: Option<PathBuf>,
        comments: C,
    ) -> Self {
        ReanimatedWorkletsVisitor {
            source_map,
            globals,
            filename,
            relative_cwd,
            in_use_animated_style: false,
            in_gesture_handler_event_callback: false,
            comments,
        }
    }

    /// Print givne fn's string with writer.
    /// This should be called with `cloned` node, as internally this'll take ownership.
    fn build_worklet_string(&mut self, fn_name: Ident, expr: Expr, closure_ident: Ident, closure_generator: ClosureGenerator) -> String {
        let (params, body) = match expr {
            Expr::Arrow(mut arrow_expr) => (
                arrow_expr.params.drain(..).map(Param::from).collect(),
                arrow_expr.body,
            ),
            Expr::Fn(fn_expr) => (
                fn_expr.function.params,
                BlockStmtOrExpr::BlockStmt(
                    fn_expr
                        .function
                        .body
                        .expect("Expect fn body exists to make worklet fn"),
                ),
            ),
            _ => todo!("unexpected"),
        };

        let mut body = match body {
            BlockStmtOrExpr::BlockStmt(body) => body,
            BlockStmtOrExpr::Expr(e) => BlockStmt {
                stmts: vec![Stmt::Expr(ExprStmt {
                    span: DUMMY_SP,
                    expr: e,
                })],
                ..BlockStmt::dummy()
            },
        };

        
        if closure_generator.size() > 0 {
            let variables = closure_generator.get_variables();
            let mut vars = variables.iter().collect::<Vec<_>>();
            // TODO: this is to match snapshot with deterministic visitor results
            vars.sort_by(|a, b| b.sym.cmp(&a.sym));

            let props = vars
                .drain(..)
                .map(|variable| {
                    ObjectPatProp::Assign(AssignPatProp {
                        span: DUMMY_SP,
                        key: variable.clone(),
                        value: None,
                    })
                })
                .collect();

            let s = Stmt::Decl(Decl::Var(VarDecl {
                kind: VarDeclKind::Const,
                decls: vec![VarDeclarator {
                    name: Pat::Object(ObjectPat {
                        span: DUMMY_SP,
                        optional: false,
                        type_ann: None,
                        props,
                    }),
                    init: Some(Box::new(Expr::Member(MemberExpr {
                        obj: Box::new(Expr::Ident(Ident::new("jsThis".into(), DUMMY_SP))),
                        prop: MemberProp::Ident(closure_ident),
                        ..MemberExpr::dummy()
                    }))),
                    ..VarDeclarator::dummy()
                }],
                ..VarDecl::dummy()
            }));

            let old = Stmt::Block(BlockStmt {
                span: DUMMY_SP,
                stmts: body.stmts,
            });

            body.stmts = vec![s, old];
        };


        let transformed_function = FnExpr {
            ident: Some(fn_name),
            function: Function {
                params,
                body: Some(body),
                ..Function::dummy()
            },
            ..FnExpr::dummy()
        };

        let mut buf = vec![];
        {
            let wr = Box::new(swc_ecma_codegen::text_writer::JsWriter::new(
                Default::default(),
                "", //"\n",
                &mut buf,
                None,
            )) as Box<dyn WriteJs>;

            let mut emitter = Emitter {
                cfg: swc_ecma_codegen::Config {
                    minify: true,
                    ..Default::default()
                },
                comments: Default::default(),
                cm: self.source_map.clone(),
                wr,
            };

            transformed_function
                .emit_with(&mut emitter)
                .ok()
                .expect("Should emit");
        }
        String::from_utf8(buf).expect("invalid utf8 character detected")
    }

    /// Actual fn to generate AST for worklet-ized function to be called across
    /// fn-like nodes (arrow fn, fnExpr)
    fn make_worklet_inner(
        &mut self,
        worklet_name: Option<Ident>,
        mut cloned: Expr,
        span: &Span,
        mut body: BlockStmtOrExpr,
        params: Vec<Param>,
        is_generator: bool,
        is_async: bool,
        type_params: Option<TsTypeParamDecl>,
        return_type: Option<TsTypeAnn>,
        decorators: Option<Vec<Decorator>>,
    ) -> Function {
        let function_name = if let Some(ident) = &worklet_name {
            ident.clone()
        } else {
            Ident::new("_f".into(), DUMMY_SP)
        };
        let private_fn_name = Ident::new("_f".into(), DUMMY_SP);

        let opt_flags = if self.in_use_animated_style {
            let mut opt_find_visitor = OptimizationFinderVisitor::new();
            cloned.visit_with(&mut opt_find_visitor);

            Some(opt_find_visitor.calculate_flags())
        } else {
            None
        };

        // TODO: this mimics existing plugin behavior runs specific transform pass
        // before running actual visitor.
        // 1. This may not required
        // 2. If required, need to way to pass config to visitors instead of Default::default()
        // https://github.com/software-mansion/react-native-reanimated/blob/b4ee4ea9a1f246c461dd1819c6f3d48440a25756/plugin.js#L367-L371=
        let mut preprocessors: Vec<Box<dyn VisitMut>> = vec![
            Box::new(shorthand()),
            Box::new(arrow()),
            Box::new(optional_chaining(Default::default())),
            Box::new(nullish_coalescing(Default::default())),
            Box::new(template_literal(Default::default())),
        ];

        for mut preprocessor in preprocessors.drain(..) {
            cloned.visit_mut_with(&mut *preprocessor);
        }

        let mut closure_visitor = ClosureIdentVisitor::new(
            Scope::new(ScopeKind::Fn, Mark::new(), None),
            &self.globals,
            &worklet_name,
        );
        cloned.visit_children_with(&mut closure_visitor);

        let mut closure_generator = closure_visitor.take_generator();
        let closure = closure_generator.build();

        let closure_ident = Ident::new("_closure".into(), DUMMY_SP);
        let as_string_ident = Ident::new("asString".into(), DUMMY_SP);
        let worklet_hash_ident = Ident::new("__workletHash".into(), DUMMY_SP);
        let location_ident = Ident::new("__location".into(), DUMMY_SP);
        let optimalization_ident = Ident::new("__optimalization".into(), DUMMY_SP);

        let func_string =
            self.build_worklet_string(function_name.clone(), cloned, closure_ident.clone(), closure_generator);
        let func_hash = calculate_hash(&func_string);

        // Naive approach to calcuate relative path from options.
        // Note this relies on plugin config option (relative_cwd) to pass specific cwd.
        // unlike original babel plugin, we can't calculate cwd inside of plugin.
        // TODO: This is not sound relative path calcuation
        let filename_str = if let Some(relative_cwd) = &self.relative_cwd {
            self.filename
                .to_string()
                .strip_prefix(
                    relative_cwd
                        .as_os_str()
                        .to_str()
                        .expect("Should able to convert cwd to string"),
                )
                .expect("Should able to strip relative cwd")
                .to_string()
        } else {
            self.filename.to_string()
        };

        let loc = self.source_map.lookup_char_pos(span.lo);
        let code_location = format!("{} ({}:{})", filename_str, loc.line, loc.col_display);

        // TODO: need to use closuregenerator

        let decorators = if let Some(decorators) = decorators {
            decorators
        } else {
            Default::default()
        };

        let func_expr = match body.take() {
            BlockStmtOrExpr::BlockStmt(body) => Expr::Fn(FnExpr {
                ident: Some(private_fn_name.clone()),
                function: Function {
                    params,
                    decorators,
                    span: DUMMY_SP,
                    body: Some(body),
                    is_generator,
                    is_async,
                    type_params,
                    return_type,
                },
            }),
            BlockStmtOrExpr::Expr(e) => {
                // This is based on assumption if fn body is not a blockstmt
                // we'll manually need to create returnstmt always.
                // TODO: need to validated further cases.

                let body = if let Expr::Paren(paren) = *e {
                    *paren.expr
                } else {
                    *e
                };

                Expr::Fn(FnExpr {
                    ident: Some(private_fn_name.clone()),
                    function: Function {
                        params,
                        decorators,
                        span: DUMMY_SP,
                        body: Some(BlockStmt {
                            stmts: vec![Stmt::Return(ReturnStmt {
                                span: DUMMY_SP,
                                arg: Some(Box::new(body)),
                            })],
                            ..BlockStmt::dummy()
                        }),
                        is_generator,
                        is_async,
                        type_params,
                        return_type,
                    },
                })
            }
        };

        let mut stmts = vec![
            // a function closure wraps original,
            // const _f = function () { .. }
            Stmt::Decl(Decl::Var(VarDecl {
                span: DUMMY_SP,
                declare: false,
                kind: VarDeclKind::Const,
                decls: vec![VarDeclarator {
                    span: DUMMY_SP,
                    definite: false,
                    name: Pat::Ident(BindingIdent::from(private_fn_name.clone())),
                    init: Some(Box::new(func_expr)),
                }],
            })),
            // _f._closure = {...}
            Stmt::Expr(ExprStmt {
                span: DUMMY_SP,
                expr: Box::new(Expr::Assign(AssignExpr {
                    span: DUMMY_SP,
                    op: AssignOp::Assign,
                    left: PatOrExpr::Expr(Box::new(Expr::Member(MemberExpr {
                        span: DUMMY_SP,
                        obj: Box::new(Expr::Ident(private_fn_name.clone())),
                        prop: MemberProp::Ident(closure_ident.clone()),
                    }))),
                    // TODO: this is not complete
                    right: Box::new(closure.clone()),
                })),
            }),
            // _f.asString
            Stmt::Expr(ExprStmt {
                span: DUMMY_SP,
                expr: Box::new(Expr::Assign(AssignExpr {
                    span: DUMMY_SP,
                    op: AssignOp::Assign,
                    left: PatOrExpr::Expr(Box::new(Expr::Member(MemberExpr {
                        span: DUMMY_SP,
                        obj: Box::new(Expr::Ident(private_fn_name.clone())),
                        prop: MemberProp::Ident(as_string_ident.clone()),
                    }))),
                    // TODO: this is not complete
                    right: Box::new(Expr::Lit(Lit::Str(Str::from(func_string)))),
                })),
            }),
            //_f.__workletHash
            Stmt::Expr(ExprStmt {
                span: DUMMY_SP,
                expr: Box::new(Expr::Assign(AssignExpr {
                    span: DUMMY_SP,
                    op: AssignOp::Assign,
                    left: PatOrExpr::Expr(Box::new(Expr::Member(MemberExpr {
                        span: DUMMY_SP,
                        obj: Box::new(Expr::Ident(private_fn_name.clone())),
                        prop: MemberProp::Ident(worklet_hash_ident.clone()),
                    }))),
                    // TODO: this is not complete
                    right: Box::new(Expr::Lit(Lit::Num(Number {
                        span: DUMMY_SP,
                        value: func_hash.into(),
                        raw: None,
                    }))),
                })),
            }),
            //_f.__location
            Stmt::Expr(ExprStmt {
                span: DUMMY_SP,
                expr: Box::new(Expr::Assign(AssignExpr {
                    span: DUMMY_SP,
                    op: AssignOp::Assign,
                    left: PatOrExpr::Expr(Box::new(Expr::Member(MemberExpr {
                        span: DUMMY_SP,
                        obj: Box::new(Expr::Ident(private_fn_name.clone())),
                        prop: MemberProp::Ident(location_ident.clone()),
                    }))),
                    right: Box::new(Expr::Lit(Lit::Str(Str::from(code_location)))),
                })),
            }),
        ];

        if let Some(opt_flags) = opt_flags {
            stmts.push(Stmt::Expr(ExprStmt {
                span: DUMMY_SP,
                expr: Box::new(Expr::Assign(AssignExpr {
                    span: DUMMY_SP,
                    op: AssignOp::Assign,
                    left: PatOrExpr::Expr(Box::new(Expr::Member(MemberExpr {
                        span: DUMMY_SP,
                        obj: Box::new(Expr::Ident(private_fn_name.clone())),
                        prop: MemberProp::Ident(optimalization_ident.clone()),
                    }))),
                    right: Box::new(Expr::Lit(Lit::Num(Number {
                        span: DUMMY_SP,
                        value: opt_flags.into(),
                        raw: None,
                    }))),
                })),
            }));
        }

        stmts.push(Stmt::Return(ReturnStmt {
            span: DUMMY_SP,
            arg: Some(Box::new(Expr::Ident(private_fn_name))),
        }));

        let body = BlockStmt {
            span: DUMMY_SP,
            stmts,
        };

        Function {
            body: Some(body),
            ..Function::dummy()
        }
    }

    fn make_worklet_from_fn(
        &mut self,
        ident: &mut Option<Ident>,
        function: &mut Function,
    ) -> Function {
        self.make_worklet_inner(
            ident.clone(),
            // Have to clone to run transform preprocessor without changing original codes
            Expr::Fn(FnExpr {
                ident: ident.take(),
                function: function.clone(),
            }),
            &function.span,
            BlockStmtOrExpr::BlockStmt(
                function
                    .body
                    .take()
                    .expect("Expect fn body exists to make worklet fn"),
            ),
            function.params.take(),
            function.is_generator,
            function.is_async,
            function.type_params.take(),
            function.return_type.take(),
            Some(function.decorators.take()),
        )
    }

    fn make_worklet_from_fn_expr(&mut self, fn_expr: &mut FnExpr) -> Function {
        self.make_worklet_from_fn(&mut fn_expr.ident, &mut fn_expr.function)
    }

    fn make_worklet_from_arrow(&mut self, arrow_expr: &mut ArrowExpr) -> Function {
        self.make_worklet_inner(
            None,
            Expr::Arrow(arrow_expr.clone()),
            &arrow_expr.span,
            arrow_expr.body.take(),
            arrow_expr.params.drain(..).map(Param::from).collect(),
            arrow_expr.is_generator,
            arrow_expr.is_async,
            arrow_expr.type_params.take(),
            arrow_expr.return_type.take(),
            None,
        )
    }

    fn process_if_fn_decl_worklet_node(&mut self, decl: &mut Decl) {
        let mut visitor = DirectiveFinderVisitor::new(self.comments.clone());
        decl.visit_mut_children_with(&mut visitor);
        if visitor.has_worklet_directive {
            self.process_worklet_fn_decl(decl);
        }
    }

    // TODO: consolidate with process_if_fn_decl_worklet_node
    fn process_if_worklet_node(&mut self, fn_like_expr: &mut Expr) {
        let mut visitor = DirectiveFinderVisitor::new(self.comments.clone());
        fn_like_expr.visit_mut_children_with(&mut visitor);
        if visitor.has_worklet_directive {
            self.process_worklet_function(fn_like_expr);
        }
    }

    fn process_worklet_object_method(&mut self, method_prop: &mut PropOrSpread) {
        let key = if let PropOrSpread::Prop(prop) = method_prop {
            match &**prop {
                Prop::Method(MethodProp { key, .. }) => Some(key.clone()),
                _ => None,
            }
        } else {
            None
        };

        if let Some(key) = key {
            let function = if let PropOrSpread::Prop(prop) = method_prop {
                if let Prop::Method(MethodProp { function, .. }) = &mut **prop {
                    // TODO: handle rest of proname enum
                    let mut fn_ident = if let PropName::Ident(i) = &key {
                        Some(i.clone())
                    } else {
                        None
                    };

                    Some(self.make_worklet_from_fn(&mut fn_ident, function))
                } else {
                    None
                }
            } else {
                None
            };

            if let Some(function) = function {
                *method_prop = PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key,
                    value: Box::new(Expr::Fn(FnExpr {
                        function,
                        ..FnExpr::dummy()
                    })),
                })));
            }
        }
    }

    fn process_worklet_fn_decl(&mut self, decl: &mut Decl) {
        if let Decl::Fn(fn_decl) = decl {
            let worklet_fn =
                self.make_worklet_from_fn(&mut Some(fn_decl.ident.clone()), &mut fn_decl.function);

            let declarator = VarDeclarator {
                name: Pat::Ident(BindingIdent::from(fn_decl.ident.take())),
                init: Some(Box::new(Expr::Call(CallExpr {
                    callee: Callee::Expr(Box::new(Expr::Fn(FnExpr {
                        ident: None,
                        function: worklet_fn,
                    }))),
                    ..CallExpr::dummy()
                }))),
                ..VarDeclarator::dummy()
            };

            *decl = Decl::Var(VarDecl {
                kind: VarDeclKind::Const,
                decls: vec![declarator],
                ..VarDecl::dummy()
            });
        }
    }

    // TODO: consolidate with process_worklet_fn_decl
    fn process_worklet_function(&mut self, fn_like_expr: &mut Expr) {
        match fn_like_expr {
            Expr::Arrow(arrow_expr) => {
                let fn_expr = self.make_worklet_from_arrow(arrow_expr);

                *fn_like_expr = Expr::Call(CallExpr {
                    callee: Callee::Expr(Box::new(Expr::Fn(FnExpr {
                        ident: Default::default(),
                        function: fn_expr,
                    }))),
                    ..CallExpr::dummy()
                });
            }
            Expr::Fn(fn_expr) => {
                // TODO: do we need to care about if fn body is empty?
                if fn_expr.function.body.is_some() {
                    let fn_expr = self.make_worklet_from_fn_expr(fn_expr);
                    *fn_like_expr = Expr::Call(CallExpr {
                        callee: Callee::Expr(Box::new(Expr::Fn(FnExpr {
                            ident: Default::default(),
                            function: fn_expr,
                        }))),
                        ..CallExpr::dummy()
                    });
                }
            }
            _ => {}
        }
    }

    fn process_worklets(&mut self, call_expr: &mut CallExpr) {
        let old = self.in_use_animated_style;
        let name = if let Callee::Expr(expr) = &call_expr.callee {
            get_callee_expr_ident(&*expr)
        } else {
            None
        };

        match name {
            Some(name) if OBJECT_HOOKS.contains(&&*name.sym) && call_expr.args.len() > 0 => {
                if &*name.sym == "useAnimatedStyle" {
                    self.in_use_animated_style = true;
                }

                let arg = call_expr.args.get_mut(0).expect("should have args");

                if let Expr::Object(object_expr) = &mut *arg.expr {
                    let properties = &mut object_expr.props;
                    for property in properties {
                        if let PropOrSpread::Prop(prop) = property {
                            match &mut **prop {
                                Prop::Method(..) => {
                                    self.process_worklet_object_method(property);
                                }
                                Prop::KeyValue(KeyValueProp { value, .. }) => {
                                    self.process_worklet_function(&mut **value);
                                }
                                _ => {}
                            };
                        }
                    }
                }
                self.in_use_animated_style = false;
            }
            Some(name) => {
                if &*name.sym == "useAnimatedStyle" {
                    self.in_use_animated_style = true;
                }

                let indexes = FUNCTION_ARGS_TO_WORKLETIZE.get(&*name.sym);

                if let Some(indexes) = indexes {
                    indexes.iter().for_each(|idx| {
                        let arg = call_expr.args.get_mut(*idx);

                        if let Some(arg) = arg {
                            self.process_worklet_function(&mut *arg.expr);
                        }
                    });
                }

                self.in_use_animated_style = old;
            }
            _ => {}
        }
    }
}

/// Checks if node matches `Gesture.Tap()` or similar.
/*
node: CallExpression(
callee: MemberExpression(
    object: Identifier('Gesture')
    property: Identifier('Tap')
)
)
*/
fn is_gesture_object(expr: &Expr) -> bool {
    if let Expr::Call(call_expr) = expr {
        if let Callee::Expr(callee) = &call_expr.callee {
            if let Expr::Member(member_expr) = &**callee {
                if let Expr::Ident(ident) = &*member_expr.obj {
                    if let MemberProp::Ident(prop_ident) = &member_expr.prop {
                        return &*ident.sym == "Gesture"
                            && GESTURE_HANDLER_GESTURE_OBJECTS
                                .iter()
                                .any(|m| *m == &*prop_ident.sym);
                    }
                }
            }
        }
    }

    false
}

/// Checks if node matches the pattern `Gesture.Foo()[*]`
/// where `[*]` represents any number of chained method calls, like `.something(42)`.
fn contains_gesture_object(expr: &Expr) -> bool {
    // direct call
    if is_gesture_object(expr) {
        return true;
    }

    // method chaining
    if let Expr::Call(call_expr) = expr {
        if let Callee::Expr(expr) = &call_expr.callee {
            if let Expr::Member(expr) = &**expr {
                return contains_gesture_object(&expr.obj);
            }
        }
    }
    return false;
}

/// Checks if node matches the pattern `Gesture.Foo()[*].onBar`
/// where `[*]` represents any number of method calls.
fn is_gesture_object_event_callback_method(callee: &Callee) -> bool {
    if let Callee::Expr(expr) = callee {
        if let Expr::Member(expr) = &**expr {
            if let MemberProp::Ident(ident) = &expr.prop {
                if GESTURE_HANDLER_BUILDER_METHODS
                    .iter()
                    .any(|m| *m == &*ident.sym)
                {
                    return contains_gesture_object(&*expr.obj);
                }
            }
        }
    }

    return false;
}

impl<C: Clone + swc_common::comments::Comments, S: swc_common::SourceMapper + SourceMapperExt>
    VisitMut for ReanimatedWorkletsVisitor<C, S>
{
    fn visit_mut_call_expr(&mut self, call_expr: &mut CallExpr) {
        if is_gesture_object_event_callback_method(&call_expr.callee) {
            let old = self.in_gesture_handler_event_callback;
            self.in_gesture_handler_event_callback =
                is_gesture_object_event_callback_method(&mut call_expr.callee);
            call_expr.visit_mut_children_with(self);
            self.in_gesture_handler_event_callback = old;
        } else {
            self.process_worklets(call_expr);
            call_expr.visit_mut_children_with(self);
        }
    }

    fn visit_mut_decl(&mut self, decl: &mut Decl) {
        decl.visit_mut_children_with(self);

        match decl {
            Decl::Fn(..) => {
                self.process_if_fn_decl_worklet_node(decl);
                if self.in_gesture_handler_event_callback {
                    self.process_worklet_fn_decl(decl);
                }
            }
            _ => {}
        }
    }

    // Note we do not transform class method itself - it should be performed by core transform instead
    fn visit_mut_class_method(&mut self, class_method: &mut ClassMethod) {
        match &mut class_method.key {
            PropName::Ident(ident) => {
                let mut visitor = DirectiveFinderVisitor::new(self.comments.clone());
                class_method.function.visit_mut_children_with(&mut visitor);

                // TODO: consolidate with process_if_fn_decl_worklet_node
                if visitor.has_worklet_directive {
                    let worklet_fn = self
                        .make_worklet_from_fn(&mut Some(ident.clone()), &mut class_method.function);
                    class_method.function = worklet_fn;
                }
            }
            _ => {}
        }
    }

    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        expr.visit_mut_children_with(self);

        match expr {
            Expr::Arrow(..) | Expr::Fn(..) => {
                self.process_if_worklet_node(expr);
                if self.in_gesture_handler_event_callback {
                    self.process_worklet_function(expr);
                }
            }
            _ => {}
        }
    }
}

pub struct WorkletsOptions {
    pub custom_globals: Option<Vec<String>>,
    pub filename: FileName,
    pub relative_cwd: Option<PathBuf>,
}

impl WorkletsOptions {
    pub fn new(
        custom_globals: Option<Vec<String>>,
        filename: FileName,
        relative_cwd: Option<PathBuf>,
    ) -> Self {
        WorkletsOptions {
            custom_globals,
            filename,
            relative_cwd,
        }
    }
}
