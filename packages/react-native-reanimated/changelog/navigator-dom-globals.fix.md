Stop redeclaring `navigator.userAgent` and `navigator.vendor` in the shipped types, which dropped their DOM `readonly` and conflicted with type packages that declare them.
