use indexmap::IndexMap;
use swc_ecmascript::ast::*;
use swc_common::{DUMMY_SP};

use crate::constants::BLACKLISTED_FUNCTIONS;

#[derive(Debug)]
pub struct IdentRef {
    name: String,
    ident: Ident,
}

#[derive(Debug)]
pub struct IdentPath {
    pub path: Vec<IdentRef>,
}

impl IdentPath {
    pub fn new(base: Ident) -> Self {
        IdentPath { path: Vec::from_iter([IdentRef { name: base.sym.to_string(), ident: base }]) }
    }

    pub fn add(&mut self, ident: Ident) {
        self.path.push(IdentRef { name: ident.sym.to_string(), ident: ident });
    }

    pub fn pop(&mut self) -> Option<IdentRef> {
        self.path.pop()
    }
}

#[derive(Debug)]
struct ClosureTrie {
    nodes: IndexMap<String, ClosureTrie>,
    ident: Option<IdentRef>,
    is_leaf: bool,
}

impl ClosureTrie {
    pub fn new(ident: Option<IdentRef>) -> Self {
        ClosureTrie { nodes: IndexMap::new(), is_leaf: false, ident: ident }
    }

    pub fn add_path(&mut self, mut path: IdentPath) {
        let current = if let Some(current) = path.pop() {
            current
        } else {
            self.is_leaf = true;
            return;
        };

        let parent = self.nodes.entry(current.name.clone()).or_insert(ClosureTrie::new(Some(current)));
        parent.add_path(path);
    }

    pub fn build(&mut self, path: &mut Vec<Ident>) -> Vec<PropOrSpread> {
        let mut result = Vec::new();

        for (name, trie) in self.nodes.iter_mut() {
            let ident = if let Some(ident) = &mut trie.ident {
                ident.ident.clone()
            } else {
                Ident::new(name.clone().into(), DUMMY_SP)
            };

            path.push(ident.clone());
            let value = if trie.is_leaf || trie.should_be_captured_whole() {
                ClosureTrie::path_to_expr(path.clone())
            } else {
                Expr::Object(ObjectLit {
                    span: DUMMY_SP,
                    props: trie.build(path),
                })
            };
            path.pop();

            result.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                key: PropName::Ident(ident),
                value: Box::new(value),
            }))))
        }

        return result;
    }

    fn should_be_captured_whole(&self) -> bool {
        for (name, _) in self.nodes.iter() {
            return name == "value" || BLACKLISTED_FUNCTIONS.iter().any(|x| { *x == name });
        }

        false
    }

    fn path_to_expr(mut path: Vec<Ident>) -> Expr {
        if path.len() == 1 {
            Expr::Ident(path.pop().unwrap())
        } else {
            let prop = path.pop().unwrap();
            Expr::Member(MemberExpr {
                span: DUMMY_SP,
                obj: Box::new(ClosureTrie::path_to_expr(path)),
                prop: MemberProp::Ident(prop),
            })
        }
    }

    fn merge(&mut self, other: ClosureTrie) {
        for (name, trie) in other.nodes.into_iter() {
            if let Some(child_trie) = self.nodes.get_mut(&name) {
                child_trie.merge(trie);
            } else {
                self.nodes.insert(name, trie);
            }
        }
    }
}

#[derive(Debug)]
pub struct ClosureGenerator {
    trie: ClosureTrie,
}

impl ClosureGenerator {
    pub fn new() -> Self {
        ClosureGenerator {
            trie: ClosureTrie::new(None),
        }
    }

    pub fn add_path(&mut self, path: IdentPath) {
        self.trie.add_path(path);
    }

    pub fn merge(&mut self, other: ClosureGenerator) {
        self.trie.merge(other.trie);
    }

    pub fn build(&mut self) -> Expr {
        let mut path = Vec::<Ident>::new();
        Expr::Object(ObjectLit {
            span: DUMMY_SP,
            props: self.trie.build(&mut path),
        })
    }

    pub fn size(&self) -> usize {
        self.trie.nodes.len()
    }

    pub fn get_variables(&self) -> Vec<Ident> {
        self.trie.nodes.iter().filter_map(|(_, node)| {
            if let Some(ident) = &node.ident {
                return Some(ident.ident.clone());
            }
            None
        }).collect()
    }
}