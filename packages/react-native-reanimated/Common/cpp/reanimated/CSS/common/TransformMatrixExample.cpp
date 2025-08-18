#include <reanimated/CSS/common/TransformMatrix.h>
#include <reanimated/CSS/common/TransformMatrix2D.h>
#include <reanimated/CSS/common/TransformMatrix3D.h>
#include <iostream>
#include <memory>
#include <vector>

namespace reanimated::css {

// Example function that works with any TransformMatrix type
void printMatrixInfo(const TransformMatrix &matrix) {
  std::cout << "Matrix: " << matrix.toString() << std::endl;
  std::cout << "Determinant: " << matrix.determinant() << std::endl;
  std::cout << "---" << std::endl;
}

// Example function that performs operations on matrices
void performMatrixOperations(
    TransformMatrix &matrix1,
    TransformMatrix &matrix2) {
  std::cout << "Matrix 1: " << matrix1.toString() << std::endl;
  std::cout << "Matrix 2: " << matrix2.toString() << std::endl;

  // Check equality
  std::cout << "Matrices are equal: " << (matrix1 == matrix2 ? "Yes" : "No")
            << std::endl;

  // Perform multiplication (polymorphic)
  try {
    matrix1 *= matrix2;
    std::cout << "After multiplication: " << matrix1.toString() << std::endl;
  } catch (const std::exception &e) {
    std::cout << "Multiplication error: " << e.what() << std::endl;
  }
}

// Example of storing different matrix types in a container
void demonstratePolymorphism() {
  std::vector<std::unique_ptr<TransformMatrix>> matrices;

  // Add 2D matrix
  matrices.push_back(
      std::make_unique<TransformMatrix2D>(TransformMatrix2D::Identity()));

  // Add 3D matrix
  matrices.push_back(
      std::make_unique<TransformMatrix3D>(TransformMatrix3D::Identity()));

  // Process all matrices polymorphically
  for (const auto &matrix : matrices) {
    printMatrixInfo(*matrix);
  }
}

// Example of type-specific operations while maintaining interface compatibility
void demonstrateTypeSpecificOperations() {
  // 2D matrix operations
  TransformMatrix2D matrix2d =
      TransformMatrix2D::Rotate(3.14159 / 4); // 45 degrees
  printMatrixInfo(matrix2d);

  // 3D matrix operations
  TransformMatrix3D matrix3d =
      TransformMatrix3D::RotateX(3.14159 / 6); // 30 degrees
  printMatrixInfo(matrix3d);

  // Same-type multiplication
  TransformMatrix2D result2d = matrix2d * TransformMatrix2D::Scale(2.0);
  TransformMatrix3D result3d = matrix3d * TransformMatrix3D::Scale(1.5);

  std::cout << "2D result: " << result2d.toString() << std::endl;
  std::cout << "3D result: " << result3d.toString() << std::endl;
}

// Example of cross-dimensional matrix multiplication using expand method
void demonstrateCrossDimensionalMultiplication() {
  TransformMatrix2D matrix2d = TransformMatrix2D::Rotate(3.14159 / 4);
  TransformMatrix3D matrix3d = TransformMatrix3D::RotateX(3.14159 / 6);

  // Expand 2D to 3D and multiply
  auto expanded2d = matrix2d.expand(4); // 2D -> 4x4
  auto result2d_3d = *expanded2d * matrix3d;
  std::cout << "2D * 3D = 3D: " << result2d_3d.toString() << std::endl;

  // Expand 2D to 3D and multiply (other way)
  auto result3d_2d = matrix3d * *expanded2d;
  std::cout << "3D * 2D = 3D: " << result3d_2d.toString() << std::endl;

  // Compound operations
  TransformMatrix3D compound =
      matrix3d * *expanded2d * TransformMatrix3D::Scale(2.0);
  std::cout << "Compound (3D * 2D * 3D): " << compound.toString() << std::endl;
}

// Example demonstrating polymorphic interface with expand method
void demonstratePolymorphicInterface() {
  std::vector<std::unique_ptr<TransformMatrix>> matrices;

  // Add different matrix types
  matrices.push_back(
      std::make_unique<TransformMatrix2D>(TransformMatrix2D::Identity()));
  matrices.push_back(
      std::make_unique<TransformMatrix3D>(TransformMatrix3D::Identity()));

  // Create a 2D and 3D matrix for multiplication
  TransformMatrix2D matrix2d = TransformMatrix2D::Rotate(3.14159 / 4);
  TransformMatrix3D matrix3d = TransformMatrix3D::RotateX(3.14159 / 6);

  std::cout << "=== Polymorphic Interface Demo ===" << std::endl;

  // Same-type multiplication works
  try {
    TransformMatrix3D result3d = matrix3d;
    result3d *= matrix3d; // 3D * 3D = 3D
    std::cout << "3D * 3D successful: " << result3d.toString() << std::endl;
  } catch (const std::exception &e) {
    std::cout << "3D * 3D failed: " << e.what() << std::endl;
  }

  // Cross-dimensional multiplication using expand
  try {
    auto expanded2d = matrix2d.expand(4);
    TransformMatrix3D result3d_2d = matrix3d;
    result3d_2d *= *expanded2d; // 3D * 2D(expanded) = 3D
    std::cout << "3D * 2D(expanded) successful: " << result3d_2d.toString()
              << std::endl;
  } catch (const std::exception &e) {
    std::cout << "3D * 2D(expanded) failed: " << e.what() << std::endl;
  }

  // Show expand functionality
  try {
    auto expanded2d = matrix2d.expand(4);
    std::cout << "2D expanded to 4D: " << expanded2d->toString() << std::endl;
    std::cout << "Expanded dimension: " << expanded2d->getDimension()
              << std::endl;
  } catch (const std::exception &e) {
    std::cout << "Expand failed: " << e.what() << std::endl;
  }
}

} // namespace reanimated::css
