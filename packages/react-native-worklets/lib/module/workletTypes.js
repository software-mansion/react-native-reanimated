'use strict';

/**
 * The below type is used for HostObjects returned by the JSI API that don't
 * have any accessible fields or methods but can carry data that is accessed
 * from the c++ side. We add a field to the type to make it possible for
 * typescript to recognize which JSI methods accept those types as arguments and
 * to be able to correctly type check other methods that may use them. However,
 * this field is not actually defined nor should be used for anything else as
 * assigning any data to those objects will throw an error.
 */
//# sourceMappingURL=workletTypes.js.map