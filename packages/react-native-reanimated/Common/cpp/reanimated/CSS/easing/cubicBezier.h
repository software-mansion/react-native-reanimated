#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/easing/common.h>

#include <jsi/jsi.h>
#include <memory>

namespace reanimated::css {

class CubicBezierEasing : public EasingBase<EasingType::CubicBezier> {
 public:
  CubicBezierEasing(double x1, double y1, double x2, double y2);
  CubicBezierEasing(jsi::Runtime &rt, const jsi::Object &easingConfig);

  double calculate(double x) const override;
  bool operator==(
      const EasingBase<EasingType::CubicBezier> &other) const override;

 private:
  const double x1_, y1_, x2_, y2_;

  double sampleCurveX(double t) const;
  double sampleCurveY(double t) const;
  double sampleCurveDerivativeX(double t) const;
  double solveCurveX(double x, double epsilon = 1e-6) const;
};

std::shared_ptr<CubicBezierEasing>
cubicBezier(double x1, double y1, double x2, double y2);

std::shared_ptr<CubicBezierEasing> cubicBezier(
    jsi::Runtime &rt,
    const jsi::Object &easingConfig);

} // namespace reanimated::css
