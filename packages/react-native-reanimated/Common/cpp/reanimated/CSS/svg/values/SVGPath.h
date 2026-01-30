#pragma once

#include <reanimated/CSS/common/transforms/vectors.h>
#include <reanimated/CSS/common/values/CSSValue.h>

#include <concepts>
#include <string>
#include <utility>
#include <vector>

namespace reanimated::css {

struct SVGPath : public CSSSimpleValue<SVGPath> {
  using Point = Vector2D;
  using Cubic = std::array<Vector2D, 4>;
  struct SubPath {
    Point M;
    std::vector<Cubic> C;
    bool Z;
    explicit SubPath(Point M) : M(M) {}
  };

  std::vector<SubPath> subPaths;

  SVGPath();
  template <typename T>
    requires std::constructible_from<std::string, T>
  explicit SVGPath(T &&value) : subPaths(parseSVGPath(std::forward<T>(value))) {}
  explicit SVGPath(std::vector<SubPath> &&subPaths);
  explicit SVGPath(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit SVGPath(const folly::dynamic &value);

  static bool isNormalizedSVGPathString(const std::string &s);
  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  SVGPath interpolate(double progress, const SVGPath &to) const override;

  bool operator==(const SVGPath &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const SVGPath &dimension);
#endif // NDEBUG

 protected:
  std::vector<SubPath> parseSVGPath(const std::string &value) const;
  std::vector<Cubic> splitCubic(Cubic cubic, int count) const;
  SubPath interpolateSubPaths(const SubPath &from, const SubPath &to, double t) const;

 private:
  Point lineAt(Point p0, Point p1, double t) const;

  Point applyDirectionalNudge(
      Point target,
      const Point &anchor,
      const Point &guide,
      const Point &altGuide,
      double epsilon = 5e-1) const;

  std::pair<Cubic, Cubic> singleSplitCubic(const Cubic &cubic, double t) const;
};

} // namespace reanimated::css
