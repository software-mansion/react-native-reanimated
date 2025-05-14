function getClosure(
  fun: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): {
  closureVariables: Identifier[];
  libraryBindingsToImport: Set<Binding>;
  relativeBindingsToImport: Set<Binding>;
} {
  const closureVariables = new Set<string>();
  const libraryBindingsToImport = new Set<Binding>();
  const relativeBindingsToImport = new Set<Binding>();
  fun.traverse(
    {
      Identifier(path) {
        const name = path.node.name;
        if (!path.isReferencedIdentifier() || path.key === 'typeName') {
          return;
        }

        if ('id' in fun.node && fun.node.id && fun.node.id.name === name) {
          return;
        }
        if (fun.scope.hasOwnBinding(path.node.name)) {
          return;
        }
        if (path.scope.hasOwnBinding(path.node.name)) {
          return;
        }
        const binding = fun.scope.getBinding(path.node.name);
        if (binding) {
          if (
            binding.kind === 'module' &&
            binding.constant &&
            binding.path.isImportSpecifier() &&
            binding.path.parentPath.isImportDeclaration() &&
            state.opts.workletModules?.some(
              (module) =>
                (
                  binding.path.parentPath as NodePath<ImportDeclaration>
                ).node.source.value.includes(module)
              // ||
              // (state.filename!.includes(module) &&
              //   (
              //     binding.path.parentPath as NodePath<ImportDeclaration>
              //   ).node.source.value.startsWith('.'))
            )
          ) {
            console.log(
              'library binding',
              name,
              'id' in fun.node && fun.node.id?.name
            );
            libraryBindingsToImport.add(binding);
          } else if (
            binding.kind === 'module' &&
            binding.constant &&
            binding.path.isImportSpecifier() &&
            binding.path.parentPath.isImportDeclaration() &&
            state.opts.workletModules?.some(
              (module) =>
                state.filename!.includes(module) &&
                (
                  binding.path.parentPath as NodePath<ImportDeclaration>
                ).node.source.value.startsWith('.')
            ) // relative import
          ) {
            console.log('binding', name, 'id' in fun.node && fun.node.id?.name);
            relativeBindingsToImport.add(binding);
          } else {
            // console.log('closure', name);
            if (globals.has(name)) {
              return;
            }
            closureVariables.add(name);
          }
        }
      },
    },
    state
  );

  const retClosureVariables = Array.from(closureVariables).map((name) =>
    identifier(name)
  );

  return {
    closureVariables: retClosureVariables,
    libraryBindingsToImport,
    relativeBindingsToImport,
  };
}
