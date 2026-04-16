#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <folly/dynamic.h>
#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

class TransformMatrix {
 public:
  using Shared = std::shared_ptr<const TransformMatrix>;

  TransformMatrix() = default;
  virtual ~TransformMatrix() = default;

  virtual size_t getDimension() const = 0;
  virtual size_t getSize() const = 0;

  virtual bool isSingular() const = 0;
  virtual bool normalize() = 0;
  virtual void transpose() = 0;
  virtual double determinant() const = 0;

  virtual std::string toString() const = 0;
  virtual folly::dynamic toDynamic() const = 0;

  virtual double &operator[](size_t index) = 0;
  virtual const double &operator[](size_t index) const = 0;
  virtual bool operator==(const TransformMatrix &other) const = 0;
};

template <typename TDerived, size_t TDimension>
class TransformMatrixBase : public TransformMatrix {
 public:
  static constexpr size_t SIZE = TDimension * TDimension;
  using MatrixArray = std::array<double, SIZE>;

  TransformMatrixBase();
  explicit TransformMatrixBase(MatrixArray matrix);
  TransformMatrixBase(const TransformMatrixBase &other);
  TransformMatrixBase(TransformMatrixBase &&other) noexcept;

  bool operator==(const TDerived &other) const;
  bool operator==(const TransformMatrix &other) const override;
  double &operator[](size_t index) override;
  const double &operator[](size_t index) const override;

  size_t getDimension() const override;
  size_t getSize() const override;
  bool isSingular() const override;
  bool normalize() override;
  void transpose() override;
  std::string toString() const override;
  folly::dynamic toDynamic() const override;

  TDerived operator*(const TDerived &rhs) const;
  TDerived &operator*=(const TDerived &rhs);

  TransformMatrixBase &operator=(const TransformMatrixBase &other);
  TransformMatrixBase &operator=(TransformMatrixBase &&other) noexcept;

 protected:
  std::array<double, SIZE> matrix_;

  MatrixArray multiply(const TDerived &rhs) const;
};

} // namespace reanimated::css
