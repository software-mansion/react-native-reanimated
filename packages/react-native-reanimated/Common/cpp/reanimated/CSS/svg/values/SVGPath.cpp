#include <reanimated/CSS/svg/values/SVGPath.h>

#include <reanimated/CSS/common/transforms/vectors.h>

#include <algorithm>
#include <cstddef>
#include <functional>
#include <optional>
#include <regex>
#include <string>

namespace reanimated::css {

using Point = Vector2D;
using Cubic = std::array<Vector2D, 4>;
using SubPath = SVGPath::SubPath;

SVGPath::SVGPath() : subPaths() {}

SVGPath::SVGPath(std::vector<SubPath> &&subPaths) : subPaths(std::move(subPaths)) {}

SVGPath::SVGPath(jsi::Runtime &rt, const jsi::Value &jsiValue) : SVGPath(jsiValue.getString(rt).utf8(rt)) {}

SVGPath::SVGPath(const folly::dynamic &value) : SVGPath(value.getString()) {}

bool SVGPath::isNormalizedSVGPathString(const std::string &s) {
  static constexpr auto WS = R"(\s*)";
  static constexpr auto NUM = R"(-?\d*\.?\d+(?:e[+-]?\d+)?)";

  static const std::string M_CMD = std::string("M") + WS + "(?:" + NUM + WS + "){2}";
  static const std::string C_CMD = std::string("C") + WS + "(?:" + NUM + WS + "){6}";
  static const std::string Z_CMD = std::string("Z") + WS;

  static const std::regex pathRegex(
      std::string(WS) + "(?:(?:" + M_CMD + ")|(?:" + C_CMD + ")|(?:" + Z_CMD + "))*", std::regex_constants::optimize);

  return std::regex_match(s, pathRegex);
}

bool SVGPath::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  if (!jsiValue.isString()) {
    return false;
  }
  return isNormalizedSVGPathString(jsiValue.getString(rt).utf8(rt));
}

bool SVGPath::canConstruct(const folly::dynamic &value) {
  if (!value.isString()) {
    return false;
  }
  return isNormalizedSVGPathString(value.getString());
}

folly::dynamic SVGPath::toDynamic() const {
  return toString();
}

std::string SVGPath::toString() const {
  std::ostringstream oss;
  oss << std::defaultfloat;
  for (size_t i = 0; i < subPaths.size(); ++i) {
    const auto &segment = subPaths[i];

    if (i > 0) {
      oss << " ";
    }

    oss << "M" << segment.M[0] << " " << segment.M[1];

    for (const auto &point : segment.C) {
      oss << " C";
      for (int j = 1; j < 4; ++j) {
        // In SVGPath C command start point is implicit
        oss << " " << point[j][0] << " " << point[j][1];
      }
    }

    if (segment.Z) {
      oss << " Z";
    }
  }
  return oss.str();
}

SVGPath SVGPath::interpolate(const double progress, const SVGPath &to) const {
  const auto &longerPath = (subPaths.size() >= to.subPaths.size()) ? subPaths : to.subPaths;
  const auto &shorterPath = (subPaths.size() < to.subPaths.size()) ? subPaths : to.subPaths;

  size_t longerSize = longerPath.size();
  size_t shorterSize = shorterPath.size();

  if (shorterSize == 0) {
    return to;
  }

  std::vector<std::reference_wrapper<const SubPath>> fromRef;
  std::vector<std::reference_wrapper<const SubPath>> toRef;

  fromRef.reserve(longerSize);
  toRef.reserve(longerSize);

  size_t baseGroupSize = longerSize / shorterSize;
  size_t remainder = longerSize % shorterSize;

  size_t longerPathIndex = 0;

  for (size_t i = 0; i < shorterSize; ++i) {
    size_t currentGroupSize = baseGroupSize + (i < remainder ? 1 : 0);

    for (size_t j = 0; j < currentGroupSize; ++j) {
      if (subPaths.size() <= to.subPaths.size()) {
        fromRef.push_back(std::cref(subPaths[i]));
        toRef.push_back(std::cref(to.subPaths[longerPathIndex]));
      } else {
        fromRef.push_back(std::cref(subPaths[longerPathIndex]));
        toRef.push_back(std::cref(to.subPaths[i]));
      }
      longerPathIndex++;
    }
  }

  std::vector<SubPath> interpolatedSubPaths;
  interpolatedSubPaths.reserve(longerSize);

  for (size_t i = 0; i < longerSize; ++i) {
    interpolatedSubPaths.push_back(interpolateSubPaths(fromRef[i], toRef[i], progress));
  }

  return SVGPath(std::move(interpolatedSubPaths));
}

bool SVGPath::operator==(const SVGPath &other) const {
  return toString() == other.toString();
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const SVGPath &value) {
  os << "SVGPath(" << value.toString() << ")";
  return os;
}

#endif // NDEBUG

std::vector<SubPath> SVGPath::parseSVGPath(const std::string &value) const {
  std::vector<SubPath> result;
  std::stringstream ss(value);
  Point currPos{}, startPos{};

  // Format of input: (M num num |C num num num num num num |Z)*
  std::optional<SubPath> buffer;

  auto pushBufferToResult = [&]() {
    if (buffer && !buffer->C.empty()) {
      result.push_back(std::move(buffer.value()));
    }
    buffer = std::nullopt;
  };

  while (ss >> std::ws && !ss.eof()) {
    char cmd;
    ss >> cmd;

    switch (cmd) {
      case 'M':
        double x, y;
        if (!(ss >> x >> y)) {
          throw std::invalid_argument("[Reanimated] Invalid coordinates for 'M' command in path: \"" + value + "\"");
        }
        pushBufferToResult();
        startPos = currPos = Point(x, y);
        buffer = SubPath(startPos);
        break;
      case 'C': {
        if (buffer && buffer->Z) {
          pushBufferToResult();
        }
        if (!buffer) {
          buffer = SubPath(currPos);
        }

        Point p0(currPos), p1, p2, p3;
        if (!(ss >> p1[0] >> p1[1] >> p2[0] >> p2[1] >> p3[0] >> p3[1])) {
          throw std::invalid_argument("[Reanimated] Invalid coordinates for 'C' command in path: \"" + value + "\"");
        }
        buffer->C.push_back({p0, p1, p2, p3});
        currPos = p3;
        break;
      }
      case 'Z':
        if (buffer) {
          buffer->Z = true;
          currPos = startPos;
          break;
        }
        // Fallthrough
      default:
        std::invalid_argument("[Reanimated] Invalid SVGPath string format (provided path: \"" + value + "\")");
    }
  }

  pushBufferToResult();

  return result;
}

std::vector<Cubic> SVGPath::splitCubic(Cubic cubic, int count) const {
  std::vector<Cubic> result;
  for (int i = 0; i < count; i++) {
    double t = 1.0 / (count - i);
    auto [st, nd] = singleSplitCubic(cubic, t);
    result.push_back(st);
    cubic = nd;
  }
  return result;
}

SubPath SVGPath::interpolateSubPaths(const SubPath &from, const SubPath &to, double t) const {
  Point newM = from.M.interpolate(t, to.M);
  SubPath result(newM);

  result.Z = t > 0.5 ? to.Z : from.Z;

  size_t longerSize = std::max(from.C.size(), to.C.size());
  size_t shorterSize = std::min(from.C.size(), to.C.size());

  if (shorterSize == 0) {
    return result;
  }

  size_t baseGroupSize = longerSize / shorterSize;
  size_t remainder = longerSize % shorterSize;

  std::vector<Cubic> prolongatedShorter;
  prolongatedShorter.reserve(longerSize);

  for (size_t i = 0; i < shorterSize; ++i) {
    size_t currentGroupSize = baseGroupSize + (i < remainder ? 1 : 0);
    std::vector<Cubic> x =
        from.C.size() <= to.C.size() ? splitCubic(from.C[i], currentGroupSize) : splitCubic(to.C[i], currentGroupSize);
    prolongatedShorter.insert(prolongatedShorter.end(), x.begin(), x.end());
  }

  auto &fromRef = from.C.size() <= to.C.size() ? prolongatedShorter : from.C;
  auto &toRef = from.C.size() <= to.C.size() ? to.C : prolongatedShorter;

  for (size_t i = 0; i < longerSize; ++i) {
    const auto &c1 = fromRef[i];
    const auto &c2 = toRef[i];

    Cubic newCubic;

    for (size_t j = 0; j < 4; ++j) {
      newCubic[j] = c1[j].interpolate(t, c2[j]);
    }

    // ensure continuity
    newCubic[0] = i == 0 ? result.M : result.C.back()[3];

    // Ensure tangent differs from 0
    {
      // TODO: This implementation of path interpolation has a problem - if we interpolate
      // a control point (e.g. of C) in a way that during its movement it collides with another point
      // of the same element (so another control point or beginning/end) we efectively get rid of
      // one of the points for this element for this frame, which breaks the math. I currently deal with it by
      // 'nudging' the point a bit when I detect a collision, which is imperfect and can cause an unplesant 'jump'
      // in the animation (visible in example 'Smooth Cubic Bézier curve'). We might want to rethink this in the future.
      constexpr double NUDGE_EPS = 5e-1;
      newCubic[1] = applyDirectionalNudge(newCubic[1], newCubic[0], newCubic[2], newCubic[3], NUDGE_EPS);
      newCubic[2] = applyDirectionalNudge(newCubic[2], newCubic[3], newCubic[1], newCubic[0], NUDGE_EPS);
    }

    result.C.push_back(newCubic);
  }

  return result;
}

Point SVGPath::lineAt(Point p0, Point p1, double t) const {
  return Point(p0[0] + t * (p1[0] - p0[0]), p0[1] + t * (p1[1] - p0[1]));
}

Point SVGPath::applyDirectionalNudge(
    Point target,
    const Point &anchor,
    const Point &guide,
    const Point &altGuide,
    double epsilon) const {
  double dx0 = target[0] - anchor[0];
  double dy0 = target[1] - anchor[1];

  if (dx0 * dx0 + dy0 * dy0 < epsilon * epsilon) {
    Point v = Point(guide[0] - anchor[0], guide[1] - anchor[1]);
    double vLen = v.length();

    if (vLen < epsilon) {
      v = Point(altGuide[0] - anchor[0], altGuide[1] - anchor[1]);
      vLen = v.length();
    }

    if (vLen < epsilon) {
      target[0] += epsilon;
      return target;
    }

    v.normalize();
    return Point(target[0] + v[0] * epsilon, target[1] + v[1] * epsilon);
  }

  return target;
}

std::pair<Cubic, Cubic> SVGPath::singleSplitCubic(const Cubic &p, double t) const {
  Point p01 = lineAt(p[0], p[1], t);
  Point p12 = lineAt(p[1], p[2], t);
  Point p23 = lineAt(p[2], p[3], t);
  Point c0 = lineAt(p01, p12, t);
  Point c1 = lineAt(p12, p23, t);
  Point q = lineAt(c0, c1, t);

  return {{p[0], p01, c0, q}, {q, c1, p23, p[3]}};
}

} // namespace reanimated::css
