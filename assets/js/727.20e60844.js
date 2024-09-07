"use strict";
exports.id = 727;
exports.ids = [727];
exports.modules = {

/***/ 93727:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DocSearchModal: () => (/* binding */ Gi)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(96540);
/* harmony import */ var _SearchBar_Bc6dn_HP_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(64814);


function Ur(e) {
  return {
    current: e
  };
}
function mr(e, t) {
  var r = void 0;
  return function() {
    for (var n = arguments.length, o = new Array(n), a = 0; a < n; a++)
      o[a] = arguments[a];
    r && clearTimeout(r), r = setTimeout(function() {
      return e.apply(void 0, o);
    }, t);
  };
}
function Vr(e, t) {
  return Qr(e) || Jr(e, t) || zr(e, t) || Wr();
}
function Wr() {
  throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function zr(e, t) {
  if (e) {
    if (typeof e == "string")
      return Et(e, t);
    var r = Object.prototype.toString.call(e).slice(8, -1);
    if (r === "Object" && e.constructor && (r = e.constructor.name), r === "Map" || r === "Set")
      return Array.from(e);
    if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))
      return Et(e, t);
  }
}
function Et(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var r = 0, n = new Array(t); r < t; r++)
    n[r] = e[r];
  return n;
}
function Jr(e, t) {
  var r = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
  if (r != null) {
    var n, o, a, c, l = [], u = !0, s = !1;
    try {
      if (a = (r = r.call(e)).next, t !== 0)
        for (; !(u = (n = a.call(r)).done) && (l.push(n.value), l.length !== t); u = !0)
          ;
    } catch (p) {
      s = !0, o = p;
    } finally {
      try {
        if (!u && r.return != null && (c = r.return(), Object(c) !== c))
          return;
      } finally {
        if (s)
          throw o;
      }
    }
    return l;
  }
}
function Qr(e) {
  if (Array.isArray(e))
    return e;
}
function tt(e) {
  "@babel/helpers - typeof";
  return tt = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, tt(e);
}
function He(e) {
  var t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : /* @__PURE__ */ new Set();
  if (true)
    return e;
  if (t.has(e))
    return "[Circular]";
  var r = t.add(e);
  return Array.isArray(e) ? e.map(function(n) {
    return He(n, r);
  }) : Object.fromEntries(Object.entries(e).map(function(n) {
    var o = Vr(n, 2), a = o[0], c = o[1];
    return [a, He(c, r)];
  }));
}
function pe(e) {
  return e.reduce(function(t, r) {
    return t.concat(r);
  }, []);
}
var Gr = 0;
function Zr() {
  return "autocomplete-".concat(Gr++);
}
function rt(e) {
  return e.collections.length === 0 ? 0 : e.collections.reduce(function(t, r) {
    return t + r.items.length;
  }, 0);
}
function de(e, t) {
  if (false)
    {}
}
function jt(e) {
  return e !== Object(e);
}
function pr(e, t) {
  if (e === t)
    return !0;
  if (jt(e) || jt(t) || typeof e == "function" || typeof t == "function")
    return e === t;
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (var r = 0, n = Object.keys(e); r < n.length; r++) {
    var o = n[r];
    if (!(o in t) || !pr(e[o], t[o]))
      return !1;
  }
  return !0;
}
var qe = function() {
};
function Yr(e) {
  if (typeof window < "u")
    return e({
      window
    });
}
var Xr = "1.9.3", en = [{
  segment: "autocomplete-core",
  version: Xr
}], _t = {
  current: {}
};
function tn(e, t) {
  if (false) { var r, n; }
}
function At(e) {
  var t = e.item, r = e.items;
  return {
    index: t.__autocomplete_indexName,
    items: [t],
    positions: [1 + r.findIndex(function(n) {
      return n.objectID === t.objectID;
    })],
    queryID: t.__autocomplete_queryID,
    algoliaSource: ["autocomplete"]
  };
}
function rn(e, t) {
  return cn(e) || an(e, t) || on(e, t) || nn();
}
function nn() {
  throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function on(e, t) {
  if (e) {
    if (typeof e == "string")
      return $t(e, t);
    var r = Object.prototype.toString.call(e).slice(8, -1);
    if (r === "Object" && e.constructor && (r = e.constructor.name), r === "Map" || r === "Set")
      return Array.from(e);
    if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))
      return $t(e, t);
  }
}
function $t(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var r = 0, n = new Array(t); r < t; r++)
    n[r] = e[r];
  return n;
}
function an(e, t) {
  var r = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
  if (r != null) {
    var n, o, a, c, l = [], u = !0, s = !1;
    try {
      if (a = (r = r.call(e)).next, t !== 0)
        for (; !(u = (n = a.call(r)).done) && (l.push(n.value), l.length !== t); u = !0)
          ;
    } catch (p) {
      s = !0, o = p;
    } finally {
      try {
        if (!u && r.return != null && (c = r.return(), Object(c) !== c))
          return;
      } finally {
        if (s)
          throw o;
      }
    }
    return l;
  }
}
function cn(e) {
  if (Array.isArray(e))
    return e;
}
function ln(e) {
  var t = (e.version || "").split(".").map(Number), r = rn(t, 2), n = r[0], o = r[1], a = n >= 3, c = n === 2 && o >= 4, l = n === 1 && o >= 10;
  return a || c || l;
}
var un = ["items"], sn = ["items"];
function ve(e) {
  "@babel/helpers - typeof";
  return ve = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, ve(e);
}
function De(e) {
  return dn(e) || pn(e) || mn(e) || fn();
}
function fn() {
  throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function mn(e, t) {
  if (e) {
    if (typeof e == "string")
      return nt(e, t);
    var r = Object.prototype.toString.call(e).slice(8, -1);
    if (r === "Object" && e.constructor && (r = e.constructor.name), r === "Map" || r === "Set")
      return Array.from(e);
    if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))
      return nt(e, t);
  }
}
function pn(e) {
  if (typeof Symbol < "u" && e[Symbol.iterator] != null || e["@@iterator"] != null)
    return Array.from(e);
}
function dn(e) {
  if (Array.isArray(e))
    return nt(e);
}
function nt(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var r = 0, n = new Array(t); r < t; r++)
    n[r] = e[r];
  return n;
}
function dr(e, t) {
  if (e == null)
    return {};
  var r = vn(e, t), n, o;
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (o = 0; o < a.length; o++)
      n = a[o], !(t.indexOf(n) >= 0) && Object.prototype.propertyIsEnumerable.call(e, n) && (r[n] = e[n]);
  }
  return r;
}
function vn(e, t) {
  if (e == null)
    return {};
  var r = {}, n = Object.keys(e), o, a;
  for (a = 0; a < n.length; a++)
    o = n[a], !(t.indexOf(o) >= 0) && (r[o] = e[o]);
  return r;
}
function Dt(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function X(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Dt(Object(r), !0).forEach(function(n) {
      hn(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : Dt(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function hn(e, t, r) {
  return t = yn(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function yn(e) {
  var t = gn(e, "string");
  return ve(t) === "symbol" ? t : String(t);
}
function gn(e, t) {
  if (ve(e) !== "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (ve(n) !== "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function bn(e) {
  for (var t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 20, r = [], n = 0; n < e.objectIDs.length; n += t)
    r.push(X(X({}, e), {}, {
      objectIDs: e.objectIDs.slice(n, n + t)
    }));
  return r;
}
function Ce(e) {
  return e.map(function(t) {
    var r = t.items, n = dr(t, un);
    return X(X({}, n), {}, {
      objectIDs: (r == null ? void 0 : r.map(function(o) {
        var a = o.objectID;
        return a;
      })) || n.objectIDs
    });
  });
}
function Sn(e) {
  var t = ln(e);
  function r(n, o, a) {
    if (t && typeof a < "u") {
      var c = a[0].__autocomplete_algoliaCredentials, l = c.appId, u = c.apiKey, s = {
        "X-Algolia-Application-Id": l,
        "X-Algolia-API-Key": u
      };
      e.apply(void 0, [n].concat(De(o), [{
        headers: s
      }]));
    } else
      e.apply(void 0, [n].concat(De(o)));
  }
  return {
    /**
     * Initializes Insights with Algolia credentials.
     */
    init: function(o, a) {
      e("init", {
        appId: o,
        apiKey: a
      });
    },
    /**
     * Sets the user token to attach to events.
     */
    setUserToken: function(o) {
      e("setUserToken", o);
    },
    /**
     * Sends click events to capture a query and its clicked items and positions.
     *
     * @link https://www.algolia.com/doc/api-reference/api-methods/clicked-object-ids-after-search/
     */
    clickedObjectIDsAfterSearch: function() {
      for (var o = arguments.length, a = new Array(o), c = 0; c < o; c++)
        a[c] = arguments[c];
      a.length > 0 && r("clickedObjectIDsAfterSearch", Ce(a), a[0].items);
    },
    /**
     * Sends click events to capture clicked items.
     *
     * @link https://www.algolia.com/doc/api-reference/api-methods/clicked-object-ids/
     */
    clickedObjectIDs: function() {
      for (var o = arguments.length, a = new Array(o), c = 0; c < o; c++)
        a[c] = arguments[c];
      a.length > 0 && r("clickedObjectIDs", Ce(a), a[0].items);
    },
    /**
     * Sends click events to capture the filters a user clicks on.
     *
     * @link https://www.algolia.com/doc/api-reference/api-methods/clicked-filters/
     */
    clickedFilters: function() {
      for (var o = arguments.length, a = new Array(o), c = 0; c < o; c++)
        a[c] = arguments[c];
      a.length > 0 && e.apply(void 0, ["clickedFilters"].concat(a));
    },
    /**
     * Sends conversion events to capture a query and its clicked items.
     *
     * @link https://www.algolia.com/doc/api-reference/api-methods/converted-object-ids-after-search/
     */
    convertedObjectIDsAfterSearch: function() {
      for (var o = arguments.length, a = new Array(o), c = 0; c < o; c++)
        a[c] = arguments[c];
      a.length > 0 && r("convertedObjectIDsAfterSearch", Ce(a), a[0].items);
    },
    /**
     * Sends conversion events to capture clicked items.
     *
     * @link https://www.algolia.com/doc/api-reference/api-methods/converted-object-ids/
     */
    convertedObjectIDs: function() {
      for (var o = arguments.length, a = new Array(o), c = 0; c < o; c++)
        a[c] = arguments[c];
      a.length > 0 && r("convertedObjectIDs", Ce(a), a[0].items);
    },
    /**
     * Sends conversion events to capture the filters a user uses when converting.
     *
     * @link https://www.algolia.com/doc/api-reference/api-methods/converted-filters/
     */
    convertedFilters: function() {
      for (var o = arguments.length, a = new Array(o), c = 0; c < o; c++)
        a[c] = arguments[c];
      a.length > 0 && e.apply(void 0, ["convertedFilters"].concat(a));
    },
    /**
     * Sends view events to capture clicked items.
     *
     * @link https://www.algolia.com/doc/api-reference/api-methods/viewed-object-ids/
     */
    viewedObjectIDs: function() {
      for (var o = arguments.length, a = new Array(o), c = 0; c < o; c++)
        a[c] = arguments[c];
      a.length > 0 && a.reduce(function(l, u) {
        var s = u.items, p = dr(u, sn);
        return [].concat(De(l), De(bn(X(X({}, p), {}, {
          objectIDs: (s == null ? void 0 : s.map(function(f) {
            var m = f.objectID;
            return m;
          })) || p.objectIDs
        })).map(function(f) {
          return {
            items: s,
            payload: f
          };
        })));
      }, []).forEach(function(l) {
        var u = l.items, s = l.payload;
        return r("viewedObjectIDs", [s], u);
      });
    },
    /**
     * Sends view events to capture the filters a user uses when viewing.
     *
     * @link https://www.algolia.com/doc/api-reference/api-methods/viewed-filters/
     */
    viewedFilters: function() {
      for (var o = arguments.length, a = new Array(o), c = 0; c < o; c++)
        a[c] = arguments[c];
      a.length > 0 && e.apply(void 0, ["viewedFilters"].concat(a));
    }
  };
}
function On(e) {
  var t = e.items, r = t.reduce(function(n, o) {
    var a;
    return n[o.__autocomplete_indexName] = ((a = n[o.__autocomplete_indexName]) !== null && a !== void 0 ? a : []).concat(o), n;
  }, {});
  return Object.keys(r).map(function(n) {
    var o = r[n];
    return {
      index: n,
      items: o,
      algoliaSource: ["autocomplete"]
    };
  });
}
function Ye(e) {
  return e.objectID && e.__autocomplete_indexName && e.__autocomplete_queryID;
}
function he(e) {
  "@babel/helpers - typeof";
  return he = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, he(e);
}
function Z(e) {
  return En(e) || wn(e) || Pn(e) || In();
}
function In() {
  throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function Pn(e, t) {
  if (e) {
    if (typeof e == "string")
      return ot(e, t);
    var r = Object.prototype.toString.call(e).slice(8, -1);
    if (r === "Object" && e.constructor && (r = e.constructor.name), r === "Map" || r === "Set")
      return Array.from(e);
    if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))
      return ot(e, t);
  }
}
function wn(e) {
  if (typeof Symbol < "u" && e[Symbol.iterator] != null || e["@@iterator"] != null)
    return Array.from(e);
}
function En(e) {
  if (Array.isArray(e))
    return ot(e);
}
function ot(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var r = 0, n = new Array(t); r < t; r++)
    n[r] = e[r];
  return n;
}
function Ct(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function q(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Ct(Object(r), !0).forEach(function(n) {
      jn(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : Ct(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function jn(e, t, r) {
  return t = _n(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function _n(e) {
  var t = An(e, "string");
  return he(t) === "symbol" ? t : String(t);
}
function An(e, t) {
  if (he(e) !== "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (he(n) !== "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
var $n = 400, vr = "2.6.0", Dn = "https://cdn.jsdelivr.net/npm/search-insights@".concat(vr, "/dist/search-insights.min.js"), Cn = mr(function(e) {
  var t = e.onItemsChange, r = e.items, n = e.insights, o = e.state;
  t({
    insights: n,
    insightsEvents: On({
      items: r
    }).map(function(a) {
      return q({
        eventName: "Items Viewed"
      }, a);
    }),
    state: o
  });
}, $n);
function Tn(e) {
  var t = xn(e), r = t.insightsClient, n = t.onItemsChange, o = t.onSelect, a = t.onActive, c = r;
  r || Yr(function(p) {
    var f = p.window, m = f.AlgoliaAnalyticsObject || "aa";
    typeof m == "string" && (c = f[m]), c || (f.AlgoliaAnalyticsObject = m, f[m] || (f[m] = function() {
      f[m].queue || (f[m].queue = []);
      for (var b = arguments.length, h = new Array(b), v = 0; v < b; v++)
        h[v] = arguments[v];
      f[m].queue.push(h);
    }), f[m].version = vr, c = f[m], Rn(f));
  });
  var l = Sn(c), u = Ur([]), s = mr(function(p) {
    var f = p.state;
    if (f.isOpen) {
      var m = f.collections.reduce(function(b, h) {
        return [].concat(Z(b), Z(h.items));
      }, []).filter(Ye);
      pr(u.current.map(function(b) {
        return b.objectID;
      }), m.map(function(b) {
        return b.objectID;
      })) || (u.current = m, m.length > 0 && Cn({
        onItemsChange: n,
        items: m,
        insights: l,
        state: f
      }));
    }
  }, 0);
  return {
    name: "aa.algoliaInsightsPlugin",
    subscribe: function(f) {
      var m = f.setContext, b = f.onSelect, h = f.onActive;
      c("addAlgoliaAgent", "insights-plugin"), m({
        algoliaInsightsPlugin: {
          __algoliaSearchParameters: {
            clickAnalytics: !0
          },
          insights: l
        }
      }), b(function(v) {
        var y = v.item, g = v.state, d = v.event;
        Ye(y) && o({
          state: g,
          event: d,
          insights: l,
          item: y,
          insightsEvents: [q({
            eventName: "Item Selected"
          }, At({
            item: y,
            items: u.current
          }))]
        });
      }), h(function(v) {
        var y = v.item, g = v.state, d = v.event;
        Ye(y) && a({
          state: g,
          event: d,
          insights: l,
          item: y,
          insightsEvents: [q({
            eventName: "Item Active"
          }, At({
            item: y,
            items: u.current
          }))]
        });
      });
    },
    onStateChange: function(f) {
      var m = f.state;
      s({
        state: m
      });
    },
    __autocomplete_pluginOptions: e
  };
}
function xn(e) {
  return q({
    onItemsChange: function(r) {
      var n = r.insights, o = r.insightsEvents;
      n.viewedObjectIDs.apply(n, Z(o.map(function(a) {
        return q(q({}, a), {}, {
          algoliaSource: [].concat(Z(a.algoliaSource || []), ["autocomplete-internal"])
        });
      })));
    },
    onSelect: function(r) {
      var n = r.insights, o = r.insightsEvents;
      n.clickedObjectIDsAfterSearch.apply(n, Z(o.map(function(a) {
        return q(q({}, a), {}, {
          algoliaSource: [].concat(Z(a.algoliaSource || []), ["autocomplete-internal"])
        });
      })));
    },
    onActive: qe
  }, e);
}
function Rn(e) {
  var t = "[Autocomplete]: Could not load search-insights.js. Please load it manually following https://alg.li/insights-autocomplete";
  try {
    var r = e.document.createElement("script");
    r.async = !0, r.src = Dn, r.onerror = function() {
      console.error(t);
    }, document.body.appendChild(r);
  } catch {
    console.error(t);
  }
}
function Nn(e) {
   false && 0;
}
function ke(e, t) {
  var r = t;
  return {
    then: function(o, a) {
      return ke(e.then(Te(o, r, e), Te(a, r, e)), r);
    },
    catch: function(o) {
      return ke(e.catch(Te(o, r, e)), r);
    },
    finally: function(o) {
      return o && r.onCancelList.push(o), ke(e.finally(Te(o && function() {
        return r.onCancelList = [], o();
      }, r, e)), r);
    },
    cancel: function() {
      r.isCanceled = !0;
      var o = r.onCancelList;
      r.onCancelList = [], o.forEach(function(a) {
        a();
      });
    },
    isCanceled: function() {
      return r.isCanceled === !0;
    }
  };
}
function Tt(e) {
  return ke(e, {
    isCanceled: !1,
    onCancelList: []
  });
}
function Te(e, t, r) {
  return e ? function(o) {
    return t.isCanceled ? o : e(o);
  } : r;
}
function Ln() {
  var e = [];
  return {
    add: function(r) {
      return e.push(r), r.finally(function() {
        e = e.filter(function(n) {
          return n !== r;
        });
      });
    },
    cancelAll: function() {
      e.forEach(function(r) {
        return r.cancel();
      });
    },
    isEmpty: function() {
      return e.length === 0;
    }
  };
}
function Mn() {
  var e = -1, t = -1, r = void 0;
  return function(o) {
    e++;
    var a = e;
    return Promise.resolve(o).then(function(c) {
      return r && a < t ? r : (t = a, r = c, c);
    });
  };
}
function xt(e, t, r, n) {
  if (!r)
    return null;
  if (e < 0 && (t === null || n !== null && t === 0))
    return r + e;
  var o = (t === null ? -1 : t) + e;
  return o <= -1 || o >= r ? n === null ? null : 0 : o;
}
function Rt(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function Nt(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Rt(Object(r), !0).forEach(function(n) {
      kn(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : Rt(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function kn(e, t, r) {
  return t = Hn(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function Hn(e) {
  var t = qn(e, "string");
  return ee(t) === "symbol" ? t : String(t);
}
function qn(e, t) {
  if (ee(e) !== "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (ee(n) !== "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function ee(e) {
  "@babel/helpers - typeof";
  return ee = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, ee(e);
}
function Fn(e, t) {
  var r = [];
  return Promise.resolve(e(t)).then(function(n) {
    return de(Array.isArray(n), function() {
      return "The `getSources` function must return an array of sources but returned type ".concat(JSON.stringify(ee(n)), `:

`).concat(JSON.stringify(He(n), null, 2));
    }), Promise.all(n.filter(function(o) {
      return !!o;
    }).map(function(o) {
      if (de(typeof o.sourceId == "string", "A source must provide a `sourceId` string."), r.includes(o.sourceId))
        throw new Error("[Autocomplete] The `sourceId` ".concat(JSON.stringify(o.sourceId), " is not unique."));
      r.push(o.sourceId);
      var a = {
        getItemInputValue: function(u) {
          var s = u.state;
          return s.query;
        },
        getItemUrl: function() {
        },
        onSelect: function(u) {
          var s = u.setIsOpen;
          s(!1);
        },
        onActive: qe,
        onResolve: qe
      };
      Object.keys(a).forEach(function(l) {
        a[l].__default = !0;
      });
      var c = Nt(Nt({}, a), o);
      return Promise.resolve(c);
    }));
  });
}
function Bn(e) {
  var t = e.collections.map(function(n) {
    return n.items.length;
  }).reduce(function(n, o, a) {
    var c = n[a - 1] || 0, l = c + o;
    return n.push(l), n;
  }, []), r = t.reduce(function(n, o) {
    return o <= e.activeItemId ? n + 1 : n;
  }, 0);
  return e.collections[r];
}
function Kn(e) {
  for (var t = e.state, r = e.collection, n = !1, o = 0, a = 0; n === !1; ) {
    var c = t.collections[o];
    if (c === r) {
      n = !0;
      break;
    }
    a += c.items.length, o++;
  }
  return t.activeItemId - a;
}
function te(e) {
  var t = Bn(e);
  if (!t)
    return null;
  var r = t.items[Kn({
    state: e,
    collection: t
  })], n = t.source, o = n.getItemInputValue({
    item: r,
    state: e
  }), a = n.getItemUrl({
    item: r,
    state: e
  });
  return {
    item: r,
    itemInputValue: o,
    itemUrl: a,
    source: n
  };
}
function Un(e, t) {
  return e === t || e.contains(t);
}
var Vn = /((gt|sm)-|galaxy nexus)|samsung[- ]|samsungbrowser/i;
function Wn(e) {
  return !!(e && e.match(Vn));
}
function zn(e) {
  return {
    results: e,
    hits: e.map(function(t) {
      return t.hits;
    }).filter(Boolean),
    facetHits: e.map(function(t) {
      var r;
      return (r = t.facetHits) === null || r === void 0 ? void 0 : r.map(function(n) {
        return {
          label: n.value,
          count: n.count,
          _highlightResult: {
            label: {
              value: n.highlighted
            }
          }
        };
      });
    }).filter(Boolean)
  };
}
function ye(e) {
  "@babel/helpers - typeof";
  return ye = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, ye(e);
}
function Lt(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function Jn(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Lt(Object(r), !0).forEach(function(n) {
      Qn(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : Lt(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function Qn(e, t, r) {
  return t = Gn(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function Gn(e) {
  var t = Zn(e, "string");
  return ye(t) === "symbol" ? t : String(t);
}
function Zn(e, t) {
  if (ye(e) !== "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (ye(n) !== "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function Yn(e, t, r) {
  var n = t.initialState;
  return {
    getState: function() {
      return n;
    },
    dispatch: function(a, c) {
      var l = Jn({}, n);
      n = e(n, {
        type: a,
        props: t,
        payload: c
      }), r({
        state: n,
        prevState: l
      });
    },
    pendingRequests: Ln()
  };
}
function ge(e) {
  "@babel/helpers - typeof";
  return ge = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, ge(e);
}
function Mt(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function xe(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Mt(Object(r), !0).forEach(function(n) {
      Xn(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : Mt(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function Xn(e, t, r) {
  return t = eo(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function eo(e) {
  var t = to(e, "string");
  return ge(t) === "symbol" ? t : String(t);
}
function to(e, t) {
  if (ge(e) !== "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (ge(n) !== "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function ro(e) {
  var t = e.store, r = function(s) {
    t.dispatch("setActiveItemId", s);
  }, n = function(s) {
    t.dispatch("setQuery", s);
  }, o = function(s) {
    var p = 0, f = s.map(function(m) {
      return xe(xe({}, m), {}, {
        // We flatten the stored items to support calling `getAlgoliaResults`
        // from the source itself.
        items: pe(m.items).map(function(b) {
          return xe(xe({}, b), {}, {
            __autocomplete_id: p++
          });
        })
      });
    });
    t.dispatch("setCollections", f);
  }, a = function(s) {
    t.dispatch("setIsOpen", s);
  }, c = function(s) {
    t.dispatch("setStatus", s);
  }, l = function(s) {
    t.dispatch("setContext", s);
  };
  return {
    setActiveItemId: r,
    setQuery: n,
    setCollections: o,
    setIsOpen: a,
    setStatus: c,
    setContext: l
  };
}
function be(e) {
  "@babel/helpers - typeof";
  return be = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, be(e);
}
function no(e) {
  return co(e) || io(e) || ao(e) || oo();
}
function oo() {
  throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function ao(e, t) {
  if (e) {
    if (typeof e == "string")
      return at(e, t);
    var r = Object.prototype.toString.call(e).slice(8, -1);
    if (r === "Object" && e.constructor && (r = e.constructor.name), r === "Map" || r === "Set")
      return Array.from(e);
    if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))
      return at(e, t);
  }
}
function io(e) {
  if (typeof Symbol < "u" && e[Symbol.iterator] != null || e["@@iterator"] != null)
    return Array.from(e);
}
function co(e) {
  if (Array.isArray(e))
    return at(e);
}
function at(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var r = 0, n = new Array(t); r < t; r++)
    n[r] = e[r];
  return n;
}
function kt(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function J(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? kt(Object(r), !0).forEach(function(n) {
      lo(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : kt(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function lo(e, t, r) {
  return t = uo(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function uo(e) {
  var t = so(e, "string");
  return be(t) === "symbol" ? t : String(t);
}
function so(e, t) {
  if (be(e) !== "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (be(n) !== "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function fo(e, t) {
  var r, n = typeof window < "u" ? window : {}, o = e.plugins || [];
  return J(J({
    debug: !1,
    openOnFocus: !1,
    placeholder: "",
    autoFocus: !1,
    defaultActiveItemId: null,
    stallThreshold: 300,
    insights: !1,
    environment: n,
    shouldPanelOpen: function(c) {
      var l = c.state;
      return rt(l) > 0;
    },
    reshape: function(c) {
      var l = c.sources;
      return l;
    }
  }, e), {}, {
    // Since `generateAutocompleteId` triggers a side effect (it increments
    // an internal counter), we don't want to execute it if unnecessary.
    id: (r = e.id) !== null && r !== void 0 ? r : Zr(),
    plugins: o,
    // The following props need to be deeply defaulted.
    initialState: J({
      activeItemId: null,
      query: "",
      completion: null,
      collections: [],
      isOpen: !1,
      status: "idle",
      context: {}
    }, e.initialState),
    onStateChange: function(c) {
      var l;
      (l = e.onStateChange) === null || l === void 0 || l.call(e, c), o.forEach(function(u) {
        var s;
        return (s = u.onStateChange) === null || s === void 0 ? void 0 : s.call(u, c);
      });
    },
    onSubmit: function(c) {
      var l;
      (l = e.onSubmit) === null || l === void 0 || l.call(e, c), o.forEach(function(u) {
        var s;
        return (s = u.onSubmit) === null || s === void 0 ? void 0 : s.call(u, c);
      });
    },
    onReset: function(c) {
      var l;
      (l = e.onReset) === null || l === void 0 || l.call(e, c), o.forEach(function(u) {
        var s;
        return (s = u.onReset) === null || s === void 0 ? void 0 : s.call(u, c);
      });
    },
    getSources: function(c) {
      return Promise.all([].concat(no(o.map(function(l) {
        return l.getSources;
      })), [e.getSources]).filter(Boolean).map(function(l) {
        return Fn(l, c);
      })).then(function(l) {
        return pe(l);
      }).then(function(l) {
        return l.map(function(u) {
          return J(J({}, u), {}, {
            onSelect: function(p) {
              u.onSelect(p), t.forEach(function(f) {
                var m;
                return (m = f.onSelect) === null || m === void 0 ? void 0 : m.call(f, p);
              });
            },
            onActive: function(p) {
              u.onActive(p), t.forEach(function(f) {
                var m;
                return (m = f.onActive) === null || m === void 0 ? void 0 : m.call(f, p);
              });
            },
            onResolve: function(p) {
              u.onResolve(p), t.forEach(function(f) {
                var m;
                return (m = f.onResolve) === null || m === void 0 ? void 0 : m.call(f, p);
              });
            }
          });
        });
      });
    },
    navigator: J({
      navigate: function(c) {
        var l = c.itemUrl;
        n.location.assign(l);
      },
      navigateNewTab: function(c) {
        var l = c.itemUrl, u = n.open(l, "_blank", "noopener");
        u == null || u.focus();
      },
      navigateNewWindow: function(c) {
        var l = c.itemUrl;
        n.open(l, "_blank", "noopener");
      }
    }, e.navigator)
  });
}
function Se(e) {
  "@babel/helpers - typeof";
  return Se = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, Se(e);
}
function Ht(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function Re(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Ht(Object(r), !0).forEach(function(n) {
      hr(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : Ht(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function hr(e, t, r) {
  return t = mo(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function mo(e) {
  var t = po(e, "string");
  return Se(t) === "symbol" ? t : String(t);
}
function po(e, t) {
  if (Se(e) !== "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (Se(n) !== "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function vo(e) {
  var t = e.collections, r = e.props, n = e.state, o = t.reduce(function(u, s) {
    return Re(Re({}, u), {}, hr({}, s.source.sourceId, Re(Re({}, s.source), {}, {
      getItems: function() {
        return pe(s.items);
      }
    })));
  }, {}), a = r.plugins.reduce(function(u, s) {
    return s.reshape ? s.reshape(u) : u;
  }, {
    sourcesBySourceId: o,
    state: n
  }), c = a.sourcesBySourceId, l = r.reshape({
    sourcesBySourceId: c,
    sources: Object.values(c),
    state: n
  });
  return pe(l).filter(Boolean).map(function(u) {
    return {
      source: u,
      items: u.getItems()
    };
  });
}
function re(e) {
  "@babel/helpers - typeof";
  return re = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, re(e);
}
function qt(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function Q(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? qt(Object(r), !0).forEach(function(n) {
      ho(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : qt(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function ho(e, t, r) {
  return t = yo(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function yo(e) {
  var t = go(e, "string");
  return re(t) === "symbol" ? t : String(t);
}
function go(e, t) {
  if (re(e) !== "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (re(n) !== "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function yr(e) {
  return Io(e) || Oo(e) || So(e) || bo();
}
function bo() {
  throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function So(e, t) {
  if (e) {
    if (typeof e == "string")
      return it(e, t);
    var r = Object.prototype.toString.call(e).slice(8, -1);
    if (r === "Object" && e.constructor && (r = e.constructor.name), r === "Map" || r === "Set")
      return Array.from(e);
    if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))
      return it(e, t);
  }
}
function Oo(e) {
  if (typeof Symbol < "u" && e[Symbol.iterator] != null || e["@@iterator"] != null)
    return Array.from(e);
}
function Io(e) {
  if (Array.isArray(e))
    return it(e);
}
function it(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var r = 0, n = new Array(t); r < t; r++)
    n[r] = e[r];
  return n;
}
function Ne(e) {
  return !!e.execute;
}
function Po(e) {
  return !!(e != null && e.execute);
}
function wo(e, t, r) {
  if (Po(e)) {
    var n = e.requesterId === "algolia" ? Object.assign.apply(Object, [{}].concat(yr(Object.keys(r.context).map(function(o) {
      var a;
      return (a = r.context[o]) === null || a === void 0 ? void 0 : a.__algoliaSearchParameters;
    })))) : {};
    return Q(Q({}, e), {}, {
      requests: e.queries.map(function(o) {
        return {
          query: e.requesterId === "algolia" ? Q(Q({}, o), {}, {
            params: Q(Q({}, n), o.params)
          }) : o,
          sourceId: t,
          transformResponse: e.transformResponse
        };
      })
    });
  }
  return {
    items: e,
    sourceId: t
  };
}
function Eo(e) {
  var t = e.reduce(function(n, o) {
    if (!Ne(o))
      return n.push(o), n;
    var a = o.searchClient, c = o.execute, l = o.requesterId, u = o.requests, s = n.find(function(m) {
      return Ne(o) && Ne(m) && m.searchClient === a && !!l && m.requesterId === l;
    });
    if (s) {
      var p;
      (p = s.items).push.apply(p, yr(u));
    } else {
      var f = {
        execute: c,
        requesterId: l,
        items: u,
        searchClient: a
      };
      n.push(f);
    }
    return n;
  }, []), r = t.map(function(n) {
    if (!Ne(n))
      return Promise.resolve(n);
    var o = n, a = o.execute, c = o.items, l = o.searchClient;
    return a({
      searchClient: l,
      requests: c
    });
  });
  return Promise.all(r).then(function(n) {
    return pe(n);
  });
}
function jo(e, t, r) {
  return t.map(function(n) {
    var o = e.filter(function(u) {
      return u.sourceId === n.sourceId;
    }), a = o.map(function(u) {
      var s = u.items;
      return s;
    }), c = o[0].transformResponse, l = c ? c(zn(a)) : a;
    return n.onResolve({
      source: n,
      results: a,
      items: l,
      state: r.getState()
    }), de(Array.isArray(l), function() {
      return 'The `getItems` function from source "'.concat(n.sourceId, '" must return an array of items but returned type ').concat(JSON.stringify(re(l)), `:

`).concat(JSON.stringify(He(l), null, 2), `.

See: https://www.algolia.com/doc/ui-libraries/autocomplete/core-concepts/sources/#param-getitems`);
    }), de(l.every(Boolean), 'The `getItems` function from source "'.concat(n.sourceId, '" must return an array of items but returned ').concat(JSON.stringify(void 0), `.

Did you forget to return items?

See: https://www.algolia.com/doc/ui-libraries/autocomplete/core-concepts/sources/#param-getitems`)), {
      source: n,
      items: l
    };
  });
}
function Oe(e) {
  "@babel/helpers - typeof";
  return Oe = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, Oe(e);
}
var _o = ["event", "nextState", "props", "query", "refresh", "store"];
function Ft(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function ue(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Ft(Object(r), !0).forEach(function(n) {
      Ao(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : Ft(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function Ao(e, t, r) {
  return t = $o(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function $o(e) {
  var t = Do(e, "string");
  return Oe(t) === "symbol" ? t : String(t);
}
function Do(e, t) {
  if (Oe(e) !== "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (Oe(n) !== "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function Co(e, t) {
  if (e == null)
    return {};
  var r = To(e, t), n, o;
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (o = 0; o < a.length; o++)
      n = a[o], !(t.indexOf(n) >= 0) && Object.prototype.propertyIsEnumerable.call(e, n) && (r[n] = e[n]);
  }
  return r;
}
function To(e, t) {
  if (e == null)
    return {};
  var r = {}, n = Object.keys(e), o, a;
  for (a = 0; a < n.length; a++)
    o = n[a], !(t.indexOf(o) >= 0) && (r[o] = e[o]);
  return r;
}
var se = null, Bt = Mn();
function Y(e) {
  var t = e.event, r = e.nextState, n = r === void 0 ? {} : r, o = e.props, a = e.query, c = e.refresh, l = e.store, u = Co(e, _o);
  se && o.environment.clearTimeout(se);
  var s = u.setCollections, p = u.setIsOpen, f = u.setQuery, m = u.setActiveItemId, b = u.setStatus;
  if (f(a), m(o.defaultActiveItemId), !a && o.openOnFocus === !1) {
    var h, v = l.getState().collections.map(function(d) {
      return ue(ue({}, d), {}, {
        items: []
      });
    });
    b("idle"), s(v), p((h = n.isOpen) !== null && h !== void 0 ? h : o.shouldPanelOpen({
      state: l.getState()
    }));
    var y = Tt(Bt(v).then(function() {
      return Promise.resolve();
    }));
    return l.pendingRequests.add(y);
  }
  b("loading"), se = o.environment.setTimeout(function() {
    b("stalled");
  }, o.stallThreshold);
  var g = Tt(Bt(o.getSources(ue({
    query: a,
    refresh: c,
    state: l.getState()
  }, u)).then(function(d) {
    return Promise.all(d.map(function(S) {
      return Promise.resolve(S.getItems(ue({
        query: a,
        refresh: c,
        state: l.getState()
      }, u))).then(function(E) {
        return wo(E, S.sourceId, l.getState());
      });
    })).then(Eo).then(function(S) {
      return jo(S, d, l);
    }).then(function(S) {
      return vo({
        collections: S,
        props: o,
        state: l.getState()
      });
    });
  }))).then(function(d) {
    var S;
    b("idle"), s(d);
    var E = o.shouldPanelOpen({
      state: l.getState()
    });
    p((S = n.isOpen) !== null && S !== void 0 ? S : o.openOnFocus && !a && E || E);
    var I = te(l.getState());
    if (l.getState().activeItemId !== null && I) {
      var P = I.item, A = I.itemInputValue, $ = I.itemUrl, N = I.source;
      N.onActive(ue({
        event: t,
        item: P,
        itemInputValue: A,
        itemUrl: $,
        refresh: c,
        source: N,
        state: l.getState()
      }, u));
    }
  }).finally(function() {
    b("idle"), se && o.environment.clearTimeout(se);
  });
  return l.pendingRequests.add(g);
}
function Ie(e) {
  "@babel/helpers - typeof";
  return Ie = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, Ie(e);
}
var xo = ["event", "props", "refresh", "store"];
function Kt(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function U(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Kt(Object(r), !0).forEach(function(n) {
      Ro(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : Kt(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function Ro(e, t, r) {
  return t = No(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function No(e) {
  var t = Lo(e, "string");
  return Ie(t) === "symbol" ? t : String(t);
}
function Lo(e, t) {
  if (Ie(e) !== "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (Ie(n) !== "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function Mo(e, t) {
  if (e == null)
    return {};
  var r = ko(e, t), n, o;
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (o = 0; o < a.length; o++)
      n = a[o], !(t.indexOf(n) >= 0) && Object.prototype.propertyIsEnumerable.call(e, n) && (r[n] = e[n]);
  }
  return r;
}
function ko(e, t) {
  if (e == null)
    return {};
  var r = {}, n = Object.keys(e), o, a;
  for (a = 0; a < n.length; a++)
    o = n[a], !(t.indexOf(o) >= 0) && (r[o] = e[o]);
  return r;
}
function Ho(e) {
  var t = e.event, r = e.props, n = e.refresh, o = e.store, a = Mo(e, xo);
  if (t.key === "ArrowUp" || t.key === "ArrowDown") {
    var c = function() {
      var h = r.environment.document.getElementById("".concat(r.id, "-item-").concat(o.getState().activeItemId));
      h && (h.scrollIntoViewIfNeeded ? h.scrollIntoViewIfNeeded(!1) : h.scrollIntoView(!1));
    }, l = function() {
      var h = te(o.getState());
      if (o.getState().activeItemId !== null && h) {
        var v = h.item, y = h.itemInputValue, g = h.itemUrl, d = h.source;
        d.onActive(U({
          event: t,
          item: v,
          itemInputValue: y,
          itemUrl: g,
          refresh: n,
          source: d,
          state: o.getState()
        }, a));
      }
    };
    t.preventDefault(), o.getState().isOpen === !1 && (r.openOnFocus || o.getState().query) ? Y(U({
      event: t,
      props: r,
      query: o.getState().query,
      refresh: n,
      store: o
    }, a)).then(function() {
      o.dispatch(t.key, {
        nextActiveItemId: r.defaultActiveItemId
      }), l(), setTimeout(c, 0);
    }) : (o.dispatch(t.key, {}), l(), c());
  } else if (t.key === "Escape")
    t.preventDefault(), o.dispatch(t.key, null), o.pendingRequests.cancelAll();
  else if (t.key === "Tab")
    o.dispatch("blur", null), o.pendingRequests.cancelAll();
  else if (t.key === "Enter") {
    if (o.getState().activeItemId === null || o.getState().collections.every(function(b) {
      return b.items.length === 0;
    })) {
      r.debug || o.pendingRequests.cancelAll();
      return;
    }
    t.preventDefault();
    var u = te(o.getState()), s = u.item, p = u.itemInputValue, f = u.itemUrl, m = u.source;
    if (t.metaKey || t.ctrlKey)
      f !== void 0 && (m.onSelect(U({
        event: t,
        item: s,
        itemInputValue: p,
        itemUrl: f,
        refresh: n,
        source: m,
        state: o.getState()
      }, a)), r.navigator.navigateNewTab({
        itemUrl: f,
        item: s,
        state: o.getState()
      }));
    else if (t.shiftKey)
      f !== void 0 && (m.onSelect(U({
        event: t,
        item: s,
        itemInputValue: p,
        itemUrl: f,
        refresh: n,
        source: m,
        state: o.getState()
      }, a)), r.navigator.navigateNewWindow({
        itemUrl: f,
        item: s,
        state: o.getState()
      }));
    else if (!t.altKey) {
      if (f !== void 0) {
        m.onSelect(U({
          event: t,
          item: s,
          itemInputValue: p,
          itemUrl: f,
          refresh: n,
          source: m,
          state: o.getState()
        }, a)), r.navigator.navigate({
          itemUrl: f,
          item: s,
          state: o.getState()
        });
        return;
      }
      Y(U({
        event: t,
        nextState: {
          isOpen: !1
        },
        props: r,
        query: p,
        refresh: n,
        store: o
      }, a)).then(function() {
        m.onSelect(U({
          event: t,
          item: s,
          itemInputValue: p,
          itemUrl: f,
          refresh: n,
          source: m,
          state: o.getState()
        }, a));
      });
    }
  }
}
function Pe(e) {
  "@babel/helpers - typeof";
  return Pe = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, Pe(e);
}
var qo = ["props", "refresh", "store"], Fo = ["inputElement", "formElement", "panelElement"], Bo = ["inputElement"], Ko = ["inputElement", "maxLength"], Uo = ["sourceIndex"], Vo = ["sourceIndex"], Wo = ["item", "source", "sourceIndex"];
function Ut(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function _(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Ut(Object(r), !0).forEach(function(n) {
      zo(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : Ut(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function zo(e, t, r) {
  return t = Jo(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function Jo(e) {
  var t = Qo(e, "string");
  return Pe(t) === "symbol" ? t : String(t);
}
function Qo(e, t) {
  if (Pe(e) !== "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (Pe(n) !== "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function V(e, t) {
  if (e == null)
    return {};
  var r = Go(e, t), n, o;
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (o = 0; o < a.length; o++)
      n = a[o], !(t.indexOf(n) >= 0) && Object.prototype.propertyIsEnumerable.call(e, n) && (r[n] = e[n]);
  }
  return r;
}
function Go(e, t) {
  if (e == null)
    return {};
  var r = {}, n = Object.keys(e), o, a;
  for (a = 0; a < n.length; a++)
    o = n[a], !(t.indexOf(o) >= 0) && (r[o] = e[o]);
  return r;
}
function Zo(e) {
  var t = e.props, r = e.refresh, n = e.store, o = V(e, qo), a = function(v) {
    var y = v.inputElement, g = v.formElement, d = v.panelElement, S = V(v, Fo);
    function E(I) {
      var P = n.getState().isOpen || !n.pendingRequests.isEmpty();
      if (!(!P || I.target === y)) {
        var A = [g, d].some(function($) {
          return Un($, I.target);
        });
        A === !1 && (n.dispatch("blur", null), t.debug || n.pendingRequests.cancelAll());
      }
    }
    return _({
      // We do not rely on the native `blur` event of the input to close the
      // panel, but rather on a custom `touchstart`/`mousedown` event outside
      // of the autocomplete elements.
      // This ensures we don't mistakenly interpret interactions within the
      // autocomplete (but outside of the input) as a signal to close the panel.
      // For example, clicking reset button causes an input blur, but if
      // `openOnFocus=true`, it shouldn't close the panel.
      // On touch devices, scrolling results (`touchmove`) causes an input blur
      // but shouldn't close the panel.
      onTouchStart: E,
      onMouseDown: E,
      // When scrolling on touch devices (mobiles, tablets, etc.), we want to
      // mimic the native platform behavior where the input is blurred to
      // hide the virtual keyboard. This gives more vertical space to
      // discover all the suggestions showing up in the panel.
      onTouchMove: function(P) {
        n.getState().isOpen === !1 || y !== t.environment.document.activeElement || P.target === y || y.blur();
      }
    }, S);
  }, c = function(v) {
    return _({
      role: "combobox",
      "aria-expanded": n.getState().isOpen,
      "aria-haspopup": "listbox",
      "aria-owns": n.getState().isOpen ? "".concat(t.id, "-list") : void 0,
      "aria-labelledby": "".concat(t.id, "-label")
    }, v);
  }, l = function(v) {
    v.inputElement;
    var y = V(v, Bo);
    return _({
      action: "",
      noValidate: !0,
      role: "search",
      onSubmit: function(d) {
        var S;
        d.preventDefault(), t.onSubmit(_({
          event: d,
          refresh: r,
          state: n.getState()
        }, o)), n.dispatch("submit", null), (S = v.inputElement) === null || S === void 0 || S.blur();
      },
      onReset: function(d) {
        var S;
        d.preventDefault(), t.onReset(_({
          event: d,
          refresh: r,
          state: n.getState()
        }, o)), n.dispatch("reset", null), (S = v.inputElement) === null || S === void 0 || S.focus();
      }
    }, y);
  }, u = function(v) {
    var y;
    function g(D) {
      (t.openOnFocus || n.getState().query) && Y(_({
        event: D,
        props: t,
        query: n.getState().completion || n.getState().query,
        refresh: r,
        store: n
      }, o)), n.dispatch("focus", null);
    }
    var d = v || {};
    d.inputElement;
    var S = d.maxLength, E = S === void 0 ? 512 : S, I = V(d, Ko), P = te(n.getState()), A = ((y = t.environment.navigator) === null || y === void 0 ? void 0 : y.userAgent) || "", $ = Wn(A), N = P != null && P.itemUrl && !$ ? "go" : "search";
    return _({
      "aria-autocomplete": "both",
      "aria-activedescendant": n.getState().isOpen && n.getState().activeItemId !== null ? "".concat(t.id, "-item-").concat(n.getState().activeItemId) : void 0,
      "aria-controls": n.getState().isOpen ? "".concat(t.id, "-list") : void 0,
      "aria-labelledby": "".concat(t.id, "-label"),
      value: n.getState().completion || n.getState().query,
      id: "".concat(t.id, "-input"),
      autoComplete: "off",
      autoCorrect: "off",
      autoCapitalize: "off",
      enterKeyHint: N,
      spellCheck: "false",
      autoFocus: t.autoFocus,
      placeholder: t.placeholder,
      maxLength: E,
      type: "search",
      onChange: function(M) {
        Y(_({
          event: M,
          props: t,
          query: M.currentTarget.value.slice(0, E),
          refresh: r,
          store: n
        }, o));
      },
      onKeyDown: function(M) {
        Ho(_({
          event: M,
          props: t,
          refresh: r,
          store: n
        }, o));
      },
      onFocus: g,
      // We don't rely on the `blur` event.
      // See explanation in `onTouchStart`/`onMouseDown`.
      // @MAJOR See if we need to keep this handler.
      onBlur: qe,
      onClick: function(M) {
        v.inputElement === t.environment.document.activeElement && !n.getState().isOpen && g(M);
      }
    }, I);
  }, s = function(v, y) {
    return typeof y < "u" ? "".concat(v, "-").concat(y) : v;
  }, p = function(v) {
    var y = v || {}, g = y.sourceIndex, d = V(y, Uo);
    return _({
      htmlFor: "".concat(s(t.id, g), "-input"),
      id: "".concat(s(t.id, g), "-label")
    }, d);
  }, f = function(v) {
    var y = v || {}, g = y.sourceIndex, d = V(y, Vo);
    return _({
      role: "listbox",
      "aria-labelledby": "".concat(s(t.id, g), "-label"),
      id: "".concat(s(t.id, g), "-list")
    }, d);
  }, m = function(v) {
    return _({
      onMouseDown: function(g) {
        g.preventDefault();
      },
      onMouseLeave: function() {
        n.dispatch("mouseleave", null);
      }
    }, v);
  }, b = function(v) {
    var y = v.item, g = v.source, d = v.sourceIndex, S = V(v, Wo);
    return _({
      id: "".concat(s(t.id, d), "-item-").concat(y.__autocomplete_id),
      role: "option",
      "aria-selected": n.getState().activeItemId === y.__autocomplete_id,
      onMouseMove: function(I) {
        if (y.__autocomplete_id !== n.getState().activeItemId) {
          n.dispatch("mousemove", y.__autocomplete_id);
          var P = te(n.getState());
          if (n.getState().activeItemId !== null && P) {
            var A = P.item, $ = P.itemInputValue, N = P.itemUrl, D = P.source;
            D.onActive(_({
              event: I,
              item: A,
              itemInputValue: $,
              itemUrl: N,
              refresh: r,
              source: D,
              state: n.getState()
            }, o));
          }
        }
      },
      onMouseDown: function(I) {
        I.preventDefault();
      },
      onClick: function(I) {
        var P = g.getItemInputValue({
          item: y,
          state: n.getState()
        }), A = g.getItemUrl({
          item: y,
          state: n.getState()
        }), $ = A ? Promise.resolve() : Y(_({
          event: I,
          nextState: {
            isOpen: !1
          },
          props: t,
          query: P,
          refresh: r,
          store: n
        }, o));
        $.then(function() {
          g.onSelect(_({
            event: I,
            item: y,
            itemInputValue: P,
            itemUrl: A,
            refresh: r,
            source: g,
            state: n.getState()
          }, o));
        });
      }
    }, S);
  };
  return {
    getEnvironmentProps: a,
    getRootProps: c,
    getFormProps: l,
    getLabelProps: p,
    getInputProps: u,
    getPanelProps: m,
    getListProps: f,
    getItemProps: b
  };
}
function we(e) {
  "@babel/helpers - typeof";
  return we = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, we(e);
}
function Vt(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function Yo(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Vt(Object(r), !0).forEach(function(n) {
      gr(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : Vt(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function gr(e, t, r) {
  return t = Xo(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function Xo(e) {
  var t = ea(e, "string");
  return we(t) === "symbol" ? t : String(t);
}
function ea(e, t) {
  if (we(e) !== "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (we(n) !== "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function ta(e) {
  var t, r, n, o, a = e.plugins, c = e.options, l = (t = (((r = c.__autocomplete_metadata) === null || r === void 0 ? void 0 : r.userAgents) || [])[0]) === null || t === void 0 ? void 0 : t.segment, u = l ? gr({}, l, Object.keys(((n = c.__autocomplete_metadata) === null || n === void 0 ? void 0 : n.options) || {})) : {};
  return {
    plugins: a.map(function(s) {
      return {
        name: s.name,
        options: Object.keys(s.__autocomplete_pluginOptions || [])
      };
    }),
    options: Yo({
      "autocomplete-core": Object.keys(c)
    }, u),
    ua: en.concat(((o = c.__autocomplete_metadata) === null || o === void 0 ? void 0 : o.userAgents) || [])
  };
}
function ra(e) {
  var t, r, n = e.metadata, o = e.environment, a = (t = o.navigator) === null || t === void 0 || (r = t.userAgent) === null || r === void 0 ? void 0 : r.includes("Algolia Crawler");
  if (a) {
    var c = o.document.createElement("meta"), l = o.document.querySelector("head");
    c.name = "algolia:metadata", setTimeout(function() {
      c.content = JSON.stringify(n), l.appendChild(c);
    }, 0);
  }
}
function Wt(e) {
  var t, r = e.state;
  return r.isOpen === !1 || r.activeItemId === null ? null : ((t = te(r)) === null || t === void 0 ? void 0 : t.itemInputValue) || null;
}
function Ee(e) {
  "@babel/helpers - typeof";
  return Ee = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, Ee(e);
}
function zt(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function O(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? zt(Object(r), !0).forEach(function(n) {
      na(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : zt(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function na(e, t, r) {
  return t = oa(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function oa(e) {
  var t = aa(e, "string");
  return Ee(t) === "symbol" ? t : String(t);
}
function aa(e, t) {
  if (Ee(e) !== "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (Ee(n) !== "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
var ia = function(t, r) {
  switch (r.type) {
    case "setActiveItemId":
      return O(O({}, t), {}, {
        activeItemId: r.payload
      });
    case "setQuery":
      return O(O({}, t), {}, {
        query: r.payload,
        completion: null
      });
    case "setCollections":
      return O(O({}, t), {}, {
        collections: r.payload
      });
    case "setIsOpen":
      return O(O({}, t), {}, {
        isOpen: r.payload
      });
    case "setStatus":
      return O(O({}, t), {}, {
        status: r.payload
      });
    case "setContext":
      return O(O({}, t), {}, {
        context: O(O({}, t.context), r.payload)
      });
    case "ArrowDown": {
      var n = O(O({}, t), {}, {
        activeItemId: r.payload.hasOwnProperty("nextActiveItemId") ? r.payload.nextActiveItemId : xt(1, t.activeItemId, rt(t), r.props.defaultActiveItemId)
      });
      return O(O({}, n), {}, {
        completion: Wt({
          state: n
        })
      });
    }
    case "ArrowUp": {
      var o = O(O({}, t), {}, {
        activeItemId: xt(-1, t.activeItemId, rt(t), r.props.defaultActiveItemId)
      });
      return O(O({}, o), {}, {
        completion: Wt({
          state: o
        })
      });
    }
    case "Escape":
      return t.isOpen ? O(O({}, t), {}, {
        activeItemId: null,
        isOpen: !1,
        completion: null
      }) : O(O({}, t), {}, {
        activeItemId: null,
        query: "",
        status: "idle",
        collections: []
      });
    case "submit":
      return O(O({}, t), {}, {
        activeItemId: null,
        isOpen: !1,
        status: "idle"
      });
    case "reset":
      return O(O({}, t), {}, {
        activeItemId: (
          // Since we open the panel on reset when openOnFocus=true
          // we need to restore the highlighted index to the defaultActiveItemId. (DocSearch use-case)
          // Since we close the panel when openOnFocus=false
          // we lose track of the highlighted index. (Query-suggestions use-case)
          r.props.openOnFocus === !0 ? r.props.defaultActiveItemId : null
        ),
        status: "idle",
        query: ""
      });
    case "focus":
      return O(O({}, t), {}, {
        activeItemId: r.props.defaultActiveItemId,
        isOpen: (r.props.openOnFocus || !!t.query) && r.props.shouldPanelOpen({
          state: t
        })
      });
    case "blur":
      return r.props.debug ? t : O(O({}, t), {}, {
        isOpen: !1,
        activeItemId: null
      });
    case "mousemove":
      return O(O({}, t), {}, {
        activeItemId: r.payload
      });
    case "mouseleave":
      return O(O({}, t), {}, {
        activeItemId: r.props.defaultActiveItemId
      });
    default:
      return de(!1, "The reducer action ".concat(JSON.stringify(r.type), " is not supported.")), t;
  }
};
function je(e) {
  "@babel/helpers - typeof";
  return je = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, je(e);
}
function Jt(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function W(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Jt(Object(r), !0).forEach(function(n) {
      ca(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : Jt(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function ca(e, t, r) {
  return t = la(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function la(e) {
  var t = ua(e, "string");
  return je(t) === "symbol" ? t : String(t);
}
function ua(e, t) {
  if (je(e) !== "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (je(n) !== "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function sa(e) {
  Nn(e);
  var t = [], r = fo(e, t), n = Yn(ia, r, c), o = ro({
    store: n
  }), a = Zo(W({
    props: r,
    refresh: l,
    store: n,
    navigator: r.navigator
  }, o));
  function c(s) {
    var p = s.prevState, f = s.state;
    r.onStateChange(W({
      prevState: p,
      state: f,
      refresh: l,
      navigator: r.navigator
    }, o));
  }
  function l() {
    return Y(W({
      event: new Event("input"),
      nextState: {
        isOpen: n.getState().isOpen
      },
      props: r,
      navigator: r.navigator,
      query: n.getState().query,
      refresh: l,
      store: n
    }, o));
  }
  if (e.insights && !r.plugins.some(function(s) {
    return s.name === "aa.algoliaInsightsPlugin";
  })) {
    var u = typeof e.insights == "boolean" ? {} : e.insights;
    r.plugins.push(Tn(u));
  }
  return r.plugins.forEach(function(s) {
    var p;
    return (p = s.subscribe) === null || p === void 0 ? void 0 : p.call(s, W(W({}, o), {}, {
      navigator: r.navigator,
      refresh: l,
      onSelect: function(m) {
        t.push({
          onSelect: m
        });
      },
      onActive: function(m) {
        t.push({
          onActive: m
        });
      },
      onResolve: function(m) {
        t.push({
          onResolve: m
        });
      }
    }));
  }), ra({
    metadata: ta({
      plugins: r.plugins,
      options: e
    }),
    environment: r.environment
  }), W(W({
    refresh: l,
    navigator: r.navigator
  }, a), o);
}
var br = 64;
function fa(e) {
  var t = e.translations, r = t === void 0 ? {} : t, n = r.searchByText, o = n === void 0 ? "Search by" : n;
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("a", {
    href: "https://www.algolia.com/ref/docsearch/?utm_source=".concat(window.location.hostname, "&utm_medium=referral&utm_content=powered_by&utm_campaign=docsearch"),
    target: "_blank",
    rel: "noopener noreferrer"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", {
    className: "DocSearch-Label"
  }, o), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    width: "77",
    height: "19",
    "aria-label": "Algolia",
    role: "img",
    id: "Layer_1",
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 2196.2 500"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("defs", null, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("style", null, ".cls-1,.cls-2{fill:#003dff;}.cls-2{fill-rule:evenodd;}")), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    className: "cls-2",
    d: "M1070.38,275.3V5.91c0-3.63-3.24-6.39-6.82-5.83l-50.46,7.94c-2.87,.45-4.99,2.93-4.99,5.84l.17,273.22c0,12.92,0,92.7,95.97,95.49,3.33,.1,6.09-2.58,6.09-5.91v-40.78c0-2.96-2.19-5.51-5.12-5.84-34.85-4.01-34.85-47.57-34.85-54.72Z"
  }), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("rect", {
    className: "cls-1",
    x: "1845.88",
    y: "104.73",
    width: "62.58",
    height: "277.9",
    rx: "5.9",
    ry: "5.9"
  }), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    className: "cls-2",
    d: "M1851.78,71.38h50.77c3.26,0,5.9-2.64,5.9-5.9V5.9c0-3.62-3.24-6.39-6.82-5.83l-50.77,7.95c-2.87,.45-4.99,2.92-4.99,5.83v51.62c0,3.26,2.64,5.9,5.9,5.9Z"
  }), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    className: "cls-2",
    d: "M1764.03,275.3V5.91c0-3.63-3.24-6.39-6.82-5.83l-50.46,7.94c-2.87,.45-4.99,2.93-4.99,5.84l.17,273.22c0,12.92,0,92.7,95.97,95.49,3.33,.1,6.09-2.58,6.09-5.91v-40.78c0-2.96-2.19-5.51-5.12-5.84-34.85-4.01-34.85-47.57-34.85-54.72Z"
  }), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    className: "cls-2",
    d: "M1631.95,142.72c-11.14-12.25-24.83-21.65-40.78-28.31-15.92-6.53-33.26-9.85-52.07-9.85-18.78,0-36.15,3.17-51.92,9.85-15.59,6.66-29.29,16.05-40.76,28.31-11.47,12.23-20.38,26.87-26.76,44.03-6.38,17.17-9.24,37.37-9.24,58.36,0,20.99,3.19,36.87,9.55,54.21,6.38,17.32,15.14,32.11,26.45,44.36,11.29,12.23,24.83,21.62,40.6,28.46,15.77,6.83,40.12,10.33,52.4,10.48,12.25,0,36.78-3.82,52.7-10.48,15.92-6.68,29.46-16.23,40.78-28.46,11.29-12.25,20.05-27.04,26.25-44.36,6.22-17.34,9.24-33.22,9.24-54.21,0-20.99-3.34-41.19-10.03-58.36-6.38-17.17-15.14-31.8-26.43-44.03Zm-44.43,163.75c-11.47,15.75-27.56,23.7-48.09,23.7-20.55,0-36.63-7.8-48.1-23.7-11.47-15.75-17.21-34.01-17.21-61.2,0-26.89,5.59-49.14,17.06-64.87,11.45-15.75,27.54-23.52,48.07-23.52,20.55,0,36.63,7.78,48.09,23.52,11.47,15.57,17.36,37.98,17.36,64.87,0,27.19-5.72,45.3-17.19,61.2Z"
  }), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    className: "cls-2",
    d: "M894.42,104.73h-49.33c-48.36,0-90.91,25.48-115.75,64.1-14.52,22.58-22.99,49.63-22.99,78.73,0,44.89,20.13,84.92,51.59,111.1,2.93,2.6,6.05,4.98,9.31,7.14,12.86,8.49,28.11,13.47,44.52,13.47,1.23,0,2.46-.03,3.68-.09,.36-.02,.71-.05,1.07-.07,.87-.05,1.75-.11,2.62-.2,.34-.03,.68-.08,1.02-.12,.91-.1,1.82-.21,2.73-.34,.21-.03,.42-.07,.63-.1,32.89-5.07,61.56-30.82,70.9-62.81v57.83c0,3.26,2.64,5.9,5.9,5.9h50.42c3.26,0,5.9-2.64,5.9-5.9V110.63c0-3.26-2.64-5.9-5.9-5.9h-56.32Zm0,206.92c-12.2,10.16-27.97,13.98-44.84,15.12-.16,.01-.33,.03-.49,.04-1.12,.07-2.24,.1-3.36,.1-42.24,0-77.12-35.89-77.12-79.37,0-10.25,1.96-20.01,5.42-28.98,11.22-29.12,38.77-49.74,71.06-49.74h49.33v142.83Z"
  }), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    className: "cls-2",
    d: "M2133.97,104.73h-49.33c-48.36,0-90.91,25.48-115.75,64.1-14.52,22.58-22.99,49.63-22.99,78.73,0,44.89,20.13,84.92,51.59,111.1,2.93,2.6,6.05,4.98,9.31,7.14,12.86,8.49,28.11,13.47,44.52,13.47,1.23,0,2.46-.03,3.68-.09,.36-.02,.71-.05,1.07-.07,.87-.05,1.75-.11,2.62-.2,.34-.03,.68-.08,1.02-.12,.91-.1,1.82-.21,2.73-.34,.21-.03,.42-.07,.63-.1,32.89-5.07,61.56-30.82,70.9-62.81v57.83c0,3.26,2.64,5.9,5.9,5.9h50.42c3.26,0,5.9-2.64,5.9-5.9V110.63c0-3.26-2.64-5.9-5.9-5.9h-56.32Zm0,206.92c-12.2,10.16-27.97,13.98-44.84,15.12-.16,.01-.33,.03-.49,.04-1.12,.07-2.24,.1-3.36,.1-42.24,0-77.12-35.89-77.12-79.37,0-10.25,1.96-20.01,5.42-28.98,11.22-29.12,38.77-49.74,71.06-49.74h49.33v142.83Z"
  }), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    className: "cls-2",
    d: "M1314.05,104.73h-49.33c-48.36,0-90.91,25.48-115.75,64.1-11.79,18.34-19.6,39.64-22.11,62.59-.58,5.3-.88,10.68-.88,16.14s.31,11.15,.93,16.59c4.28,38.09,23.14,71.61,50.66,94.52,2.93,2.6,6.05,4.98,9.31,7.14,12.86,8.49,28.11,13.47,44.52,13.47h0c17.99,0,34.61-5.93,48.16-15.97,16.29-11.58,28.88-28.54,34.48-47.75v50.26h-.11v11.08c0,21.84-5.71,38.27-17.34,49.36-11.61,11.08-31.04,16.63-58.25,16.63-11.12,0-28.79-.59-46.6-2.41-2.83-.29-5.46,1.5-6.27,4.22l-12.78,43.11c-1.02,3.46,1.27,7.02,4.83,7.53,21.52,3.08,42.52,4.68,54.65,4.68,48.91,0,85.16-10.75,108.89-32.21,21.48-19.41,33.15-48.89,35.2-88.52V110.63c0-3.26-2.64-5.9-5.9-5.9h-56.32Zm0,64.1s.65,139.13,0,143.36c-12.08,9.77-27.11,13.59-43.49,14.7-.16,.01-.33,.03-.49,.04-1.12,.07-2.24,.1-3.36,.1-1.32,0-2.63-.03-3.94-.1-40.41-2.11-74.52-37.26-74.52-79.38,0-10.25,1.96-20.01,5.42-28.98,11.22-29.12,38.77-49.74,71.06-49.74h49.33Z"
  }), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    className: "cls-1",
    d: "M249.83,0C113.3,0,2,110.09,.03,246.16c-2,138.19,110.12,252.7,248.33,253.5,42.68,.25,83.79-10.19,120.3-30.03,3.56-1.93,4.11-6.83,1.08-9.51l-23.38-20.72c-4.75-4.21-11.51-5.4-17.36-2.92-25.48,10.84-53.17,16.38-81.71,16.03-111.68-1.37-201.91-94.29-200.13-205.96,1.76-110.26,92-199.41,202.67-199.41h202.69V407.41l-115-102.18c-3.72-3.31-9.42-2.66-12.42,1.31-18.46,24.44-48.53,39.64-81.93,37.34-46.33-3.2-83.87-40.5-87.34-86.81-4.15-55.24,39.63-101.52,94-101.52,49.18,0,89.68,37.85,93.91,85.95,.38,4.28,2.31,8.27,5.52,11.12l29.95,26.55c3.4,3.01,8.79,1.17,9.63-3.3,2.16-11.55,2.92-23.58,2.07-35.92-4.82-70.34-61.8-126.93-132.17-131.26-80.68-4.97-148.13,58.14-150.27,137.25-2.09,77.1,61.08,143.56,138.19,145.26,32.19,.71,62.03-9.41,86.14-26.95l150.26,133.2c6.44,5.71,16.61,1.14,16.61-7.47V9.48C499.66,4.25,495.42,0,490.18,0H249.83Z"
  })));
}
function Le(e) {
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    width: "15",
    height: "15",
    "aria-label": e.ariaLabel,
    role: "img"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("g", {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: "1.2"
  }, e.children));
}
function ma(e) {
  var t = e.translations, r = t === void 0 ? {} : t, n = r.selectText, o = n === void 0 ? "to select" : n, a = r.selectKeyAriaLabel, c = a === void 0 ? "Enter key" : a, l = r.navigateText, u = l === void 0 ? "to navigate" : l, s = r.navigateUpKeyAriaLabel, p = s === void 0 ? "Arrow up" : s, f = r.navigateDownKeyAriaLabel, m = f === void 0 ? "Arrow down" : f, b = r.closeText, h = b === void 0 ? "to close" : b, v = r.closeKeyAriaLabel, y = v === void 0 ? "Escape key" : v, g = r.searchByText, d = g === void 0 ? "Search by" : g;
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-Logo"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(fa, {
    translations: {
      searchByText: d
    }
  })), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("ul", {
    className: "DocSearch-Commands"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("li", null, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("kbd", {
    className: "DocSearch-Commands-Key"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Le, {
    ariaLabel: c
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M12 3.53088v3c0 1-1 2-2 2H4M7 11.53088l-3-3 3-3"
  }))), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", {
    className: "DocSearch-Label"
  }, o)), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("li", null, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("kbd", {
    className: "DocSearch-Commands-Key"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Le, {
    ariaLabel: m
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M7.5 3.5v8M10.5 8.5l-3 3-3-3"
  }))), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("kbd", {
    className: "DocSearch-Commands-Key"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Le, {
    ariaLabel: p
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M7.5 11.5v-8M10.5 6.5l-3-3-3 3"
  }))), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", {
    className: "DocSearch-Label"
  }, u)), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("li", null, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("kbd", {
    className: "DocSearch-Commands-Key"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Le, {
    ariaLabel: y
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M13.6167 8.936c-.1065.3583-.6883.962-1.4875.962-.7993 0-1.653-.9165-1.653-2.1258v-.5678c0-1.2548.7896-2.1016 1.653-2.1016.8634 0 1.3601.4778 1.4875 1.0724M9 6c-.1352-.4735-.7506-.9219-1.46-.8972-.7092.0246-1.344.57-1.344 1.2166s.4198.8812 1.3445.9805C8.465 7.3992 8.968 7.9337 9 8.5c.032.5663-.454 1.398-1.4595 1.398C6.6593 9.898 6 9 5.963 8.4851m-1.4748.5368c-.2635.5941-.8099.876-1.5443.876s-1.7073-.6248-1.7073-2.204v-.4603c0-1.0416.721-2.131 1.7073-2.131.9864 0 1.6425 1.031 1.5443 2.2492h-2.956"
  }))), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", {
    className: "DocSearch-Label"
  }, h))));
}
function pa(e) {
  var t = e.hit, r = e.children;
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("a", {
    href: t.url
  }, r);
}
function da() {
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    viewBox: "0 0 38 38",
    stroke: "currentColor",
    strokeOpacity: ".5"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("g", {
    fill: "none",
    fillRule: "evenodd"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("g", {
    transform: "translate(1 1)",
    strokeWidth: "2"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("circle", {
    strokeOpacity: ".3",
    cx: "18",
    cy: "18",
    r: "18"
  }), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M36 18c0-9.94-8.06-18-18-18"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("animateTransform", {
    attributeName: "transform",
    type: "rotate",
    from: "0 18 18",
    to: "360 18 18",
    dur: "1s",
    repeatCount: "indefinite"
  })))));
}
function va() {
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 20 20"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("g", {
    stroke: "currentColor",
    fill: "none",
    fillRule: "evenodd",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M3.18 6.6a8.23 8.23 0 1112.93 9.94h0a8.23 8.23 0 01-11.63 0"
  }), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M6.44 7.25H2.55V3.36M10.45 6v5.6M10.45 11.6L13 13"
  })));
}
function ct() {
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 20 20"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M10 10l5.09-5.09L10 10l5.09 5.09L10 10zm0 0L4.91 4.91 10 10l-5.09 5.09L10 10z",
    stroke: "currentColor",
    fill: "none",
    fillRule: "evenodd",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }));
}
function ha() {
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    className: "DocSearch-Hit-Select-Icon",
    width: "20",
    height: "20",
    viewBox: "0 0 20 20"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("g", {
    stroke: "currentColor",
    fill: "none",
    fillRule: "evenodd",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M18 3v4c0 2-2 4-4 4H2"
  }), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M8 17l-6-6 6-6"
  })));
}
var ya = function() {
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 20 20"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M17 6v12c0 .52-.2 1-1 1H4c-.7 0-1-.33-1-1V2c0-.55.42-1 1-1h8l5 5zM14 8h-3.13c-.51 0-.87-.34-.87-.87V4",
    stroke: "currentColor",
    fill: "none",
    fillRule: "evenodd",
    strokeLinejoin: "round"
  }));
};
function ga(e) {
  switch (e.type) {
    case "lvl1":
      return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(ya, null);
    case "content":
      return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Sa, null);
    default:
      return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(ba, null);
  }
}
function ba() {
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 20 20"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M13 13h4-4V8H7v5h6v4-4H7V8H3h4V3v5h6V3v5h4-4v5zm-6 0v4-4H3h4z",
    stroke: "currentColor",
    fill: "none",
    fillRule: "evenodd",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }));
}
function Sa() {
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 20 20"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M17 5H3h14zm0 5H3h14zm0 5H3h14z",
    stroke: "currentColor",
    fill: "none",
    fillRule: "evenodd",
    strokeLinejoin: "round"
  }));
}
function Qt() {
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 20 20"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M10 14.2L5 17l1-5.6-4-4 5.5-.7 2.5-5 2.5 5 5.6.8-4 4 .9 5.5z",
    stroke: "currentColor",
    fill: "none",
    fillRule: "evenodd",
    strokeLinejoin: "round"
  }));
}
function Oa() {
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    width: "40",
    height: "40",
    viewBox: "0 0 20 20",
    fill: "none",
    fillRule: "evenodd",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M19 4.8a16 16 0 00-2-1.2m-3.3-1.2A16 16 0 001.1 4.7M16.7 8a12 12 0 00-2.8-1.4M10 6a12 12 0 00-6.7 2M12.3 14.7a4 4 0 00-4.5 0M14.5 11.4A8 8 0 0010 10M3 16L18 2M10 18h0"
  }));
}
function Ia() {
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    width: "40",
    height: "40",
    viewBox: "0 0 20 20",
    fill: "none",
    fillRule: "evenodd",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M15.5 4.8c2 3 1.7 7-1 9.7h0l4.3 4.3-4.3-4.3a7.8 7.8 0 01-9.8 1m-2.2-2.2A7.8 7.8 0 0113.2 2.4M2 18L18 2"
  }));
}
function Pa(e) {
  var t = e.translations, r = t === void 0 ? {} : t, n = r.titleText, o = n === void 0 ? "Unable to fetch results" : n, a = r.helpText, c = a === void 0 ? "You might want to check your network connection." : a;
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-ErrorScreen"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-Screen-Icon"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Oa, null)), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("p", {
    className: "DocSearch-Title"
  }, o), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("p", {
    className: "DocSearch-Help"
  }, c));
}
var wa = ["translations"];
function Ea(e) {
  return $a(e) || Aa(e) || _a(e) || ja();
}
function ja() {
  throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function _a(e, t) {
  if (e) {
    if (typeof e == "string")
      return lt(e, t);
    var r = Object.prototype.toString.call(e).slice(8, -1);
    if (r === "Object" && e.constructor && (r = e.constructor.name), r === "Map" || r === "Set")
      return Array.from(e);
    if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))
      return lt(e, t);
  }
}
function Aa(e) {
  if (typeof Symbol < "u" && e[Symbol.iterator] != null || e["@@iterator"] != null)
    return Array.from(e);
}
function $a(e) {
  if (Array.isArray(e))
    return lt(e);
}
function lt(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var r = 0, n = new Array(t); r < t; r++)
    n[r] = e[r];
  return n;
}
function Da(e, t) {
  if (e == null)
    return {};
  var r = Ca(e, t), n, o;
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (o = 0; o < a.length; o++)
      n = a[o], !(t.indexOf(n) >= 0) && Object.prototype.propertyIsEnumerable.call(e, n) && (r[n] = e[n]);
  }
  return r;
}
function Ca(e, t) {
  if (e == null)
    return {};
  var r = {}, n = Object.keys(e), o, a;
  for (a = 0; a < n.length; a++)
    o = n[a], !(t.indexOf(o) >= 0) && (r[o] = e[o]);
  return r;
}
function Ta(e) {
  var t = e.translations, r = t === void 0 ? {} : t, n = Da(e, wa), o = r.noResultsText, a = o === void 0 ? "No results for" : o, c = r.suggestedQueryText, l = c === void 0 ? "Try searching for" : c, u = r.reportMissingResultsText, s = u === void 0 ? "Believe this query should return results?" : u, p = r.reportMissingResultsLinkText, f = p === void 0 ? "Let us know." : p, m = n.state.context.searchSuggestions;
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-NoResults"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-Screen-Icon"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Ia, null)), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("p", {
    className: "DocSearch-Title"
  }, a, ' "', /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("strong", null, n.state.query), '"'), m && m.length > 0 && /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-NoResults-Prefill-List"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("p", {
    className: "DocSearch-Help"
  }, l, ":"), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("ul", null, m.slice(0, 3).reduce(function(b, h) {
    return [].concat(Ea(b), [/* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("li", {
      key: h
    }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", {
      className: "DocSearch-Prefill",
      key: h,
      type: "button",
      onClick: function() {
        n.setQuery(h.toLowerCase() + " "), n.refresh(), n.inputRef.current.focus();
      }
    }, h))]);
  }, []))), n.getMissingResultsUrl && /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("p", {
    className: "DocSearch-Help"
  }, "".concat(s, " "), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("a", {
    href: n.getMissingResultsUrl({
      query: n.state.query
    }),
    target: "_blank",
    rel: "noopener noreferrer"
  }, f)));
}
var xa = ["hit", "attribute", "tagName"];
function Gt(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function Zt(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Gt(Object(r), !0).forEach(function(n) {
      Ra(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : Gt(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function Ra(e, t, r) {
  return t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function Na(e, t) {
  if (e == null)
    return {};
  var r = La(e, t), n, o;
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (o = 0; o < a.length; o++)
      n = a[o], !(t.indexOf(n) >= 0) && Object.prototype.propertyIsEnumerable.call(e, n) && (r[n] = e[n]);
  }
  return r;
}
function La(e, t) {
  if (e == null)
    return {};
  var r = {}, n = Object.keys(e), o, a;
  for (a = 0; a < n.length; a++)
    o = n[a], !(t.indexOf(o) >= 0) && (r[o] = e[o]);
  return r;
}
function Yt(e, t) {
  var r = t.split(".");
  return r.reduce(function(n, o) {
    return n != null && n[o] ? n[o] : null;
  }, e);
}
function G(e) {
  var t = e.hit, r = e.attribute, n = e.tagName, o = n === void 0 ? "span" : n, a = Na(e, xa);
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(o, Zt(Zt({}, a), {}, {
    dangerouslySetInnerHTML: {
      __html: Yt(t, "_snippetResult.".concat(r, ".value")) || Yt(t, r)
    }
  }));
}
function Xt(e, t) {
  return qa(e) || Ha(e, t) || ka(e, t) || Ma();
}
function Ma() {
  throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function ka(e, t) {
  if (e) {
    if (typeof e == "string")
      return er(e, t);
    var r = Object.prototype.toString.call(e).slice(8, -1);
    if (r === "Object" && e.constructor && (r = e.constructor.name), r === "Map" || r === "Set")
      return Array.from(e);
    if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))
      return er(e, t);
  }
}
function er(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var r = 0, n = new Array(t); r < t; r++)
    n[r] = e[r];
  return n;
}
function Ha(e, t) {
  var r = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
  if (r != null) {
    var n = [], o = !0, a = !1, c, l;
    try {
      for (r = r.call(e); !(o = (c = r.next()).done) && (n.push(c.value), !(t && n.length === t)); o = !0)
        ;
    } catch (u) {
      a = !0, l = u;
    } finally {
      try {
        !o && r.return != null && r.return();
      } finally {
        if (a)
          throw l;
      }
    }
    return n;
  }
}
function qa(e) {
  if (Array.isArray(e))
    return e;
}
function Fe() {
  return Fe = Object.assign || function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r)
        Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
    }
    return e;
  }, Fe.apply(this, arguments);
}
function ut(e) {
  return !e.collection || e.collection.items.length === 0 ? null : /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("section", {
    className: "DocSearch-Hits"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-Hit-source"
  }, e.title), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("ul", e.getListProps(), e.collection.items.map(function(t, r) {
    return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Fa, Fe({
      key: [e.title, t.objectID].join(":"),
      item: t,
      index: r
    }, e));
  })));
}
function Fa(e) {
  var t = e.item, r = e.index, n = e.renderIcon, o = e.renderAction, a = e.getItemProps, c = e.onItemClick, l = e.collection, u = e.hitComponent, s = react__WEBPACK_IMPORTED_MODULE_0__.useState(!1), p = Xt(s, 2), f = p[0], m = p[1], b = react__WEBPACK_IMPORTED_MODULE_0__.useState(!1), h = Xt(b, 2), v = h[0], y = h[1], g = react__WEBPACK_IMPORTED_MODULE_0__.useRef(null), d = u;
  function S(I) {
    m(!0), g.current = I;
  }
  function E(I) {
    y(!0), g.current = I;
  }
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("li", Fe({
    className: ["DocSearch-Hit", t.__docsearch_parent && "DocSearch-Hit--Child", f && "DocSearch-Hit--deleting", v && "DocSearch-Hit--favoriting"].filter(Boolean).join(" "),
    onTransitionEnd: function() {
      g.current && g.current();
    }
  }, a({
    item: t,
    source: l.source,
    onClick: function(P) {
      c(t, P);
    }
  })), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(d, {
    hit: t
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-Hit-Container"
  }, n({
    item: t,
    index: r
  }), t.hierarchy[t.type] && t.type === "lvl1" && /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-Hit-content-wrapper"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(G, {
    className: "DocSearch-Hit-title",
    hit: t,
    attribute: "hierarchy.lvl1"
  }), t.content && /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(G, {
    className: "DocSearch-Hit-path",
    hit: t,
    attribute: "content"
  })), t.hierarchy[t.type] && (t.type === "lvl2" || t.type === "lvl3" || t.type === "lvl4" || t.type === "lvl5" || t.type === "lvl6") && /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-Hit-content-wrapper"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(G, {
    className: "DocSearch-Hit-title",
    hit: t,
    attribute: "hierarchy.".concat(t.type)
  }), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(G, {
    className: "DocSearch-Hit-path",
    hit: t,
    attribute: "hierarchy.lvl1"
  })), t.type === "content" && /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-Hit-content-wrapper"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(G, {
    className: "DocSearch-Hit-title",
    hit: t,
    attribute: "content"
  }), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(G, {
    className: "DocSearch-Hit-path",
    hit: t,
    attribute: "hierarchy.lvl1"
  })), o({
    item: t,
    runDeleteTransition: S,
    runFavoriteTransition: E
  }))));
}
function tr(e, t, r) {
  return e.reduce(function(n, o) {
    var a = t(o);
    return n.hasOwnProperty(a) || (n[a] = []), n[a].length < (r || 5) && n[a].push(o), n;
  }, {});
}
function rr(e) {
  return e;
}
function Me(e) {
  var t = e.button === 1;
  return t || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
}
function Ba() {
}
var Sr = /(<mark>|<\/mark>)/g, Ka = RegExp(Sr.source);
function Or(e) {
  var t, r, n = e;
  if (!n.__docsearch_parent && !e._highlightResult)
    return e.hierarchy.lvl0;
  var o = (n.__docsearch_parent ? (t = n.__docsearch_parent) === null || t === void 0 || (t = t._highlightResult) === null || t === void 0 || (t = t.hierarchy) === null || t === void 0 ? void 0 : t.lvl0 : (r = e._highlightResult) === null || r === void 0 || (r = r.hierarchy) === null || r === void 0 ? void 0 : r.lvl0) || {}, a = o.value;
  return a && Ka.test(a) ? a.replace(Sr, "") : a;
}
function st() {
  return st = Object.assign || function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r)
        Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
    }
    return e;
  }, st.apply(this, arguments);
}
function Ua(e) {
  return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-Dropdown-Container"
  }, e.state.collections.map(function(t) {
    if (t.items.length === 0)
      return null;
    var r = Or(t.items[0]);
    return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(ut, st({}, e, {
      key: t.source.sourceId,
      title: r,
      collection: t,
      renderIcon: function(o) {
        var a, c = o.item, l = o.index;
        return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, c.__docsearch_parent && /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
          className: "DocSearch-Hit-Tree",
          viewBox: "0 0 24 54"
        }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("g", {
          stroke: "currentColor",
          fill: "none",
          fillRule: "evenodd",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }, c.__docsearch_parent !== ((a = t.items[l + 1]) === null || a === void 0 ? void 0 : a.__docsearch_parent) ? /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
          d: "M8 6v21M20 27H8.3"
        }) : /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
          d: "M8 6v42M20 27H8.3"
        }))), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
          className: "DocSearch-Hit-icon"
        }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(ga, {
          type: c.type
        })));
      },
      renderAction: function() {
        return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
          className: "DocSearch-Hit-action"
        }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(ha, null));
      }
    }));
  }), e.resultsFooterComponent && /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("section", {
    className: "DocSearch-HitsFooter"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(e.resultsFooterComponent, {
    state: e.state
  })));
}
var Va = ["translations"];
function Be() {
  return Be = Object.assign || function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r)
        Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
    }
    return e;
  }, Be.apply(this, arguments);
}
function Wa(e, t) {
  if (e == null)
    return {};
  var r = za(e, t), n, o;
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (o = 0; o < a.length; o++)
      n = a[o], !(t.indexOf(n) >= 0) && Object.prototype.propertyIsEnumerable.call(e, n) && (r[n] = e[n]);
  }
  return r;
}
function za(e, t) {
  if (e == null)
    return {};
  var r = {}, n = Object.keys(e), o, a;
  for (a = 0; a < n.length; a++)
    o = n[a], !(t.indexOf(o) >= 0) && (r[o] = e[o]);
  return r;
}
function Ja(e) {
  var t = e.translations, r = t === void 0 ? {} : t, n = Wa(e, Va), o = r.recentSearchesTitle, a = o === void 0 ? "Recent" : o, c = r.noRecentSearchesText, l = c === void 0 ? "No recent searches" : c, u = r.saveRecentSearchButtonTitle, s = u === void 0 ? "Save this search" : u, p = r.removeRecentSearchButtonTitle, f = p === void 0 ? "Remove this search from history" : p, m = r.favoriteSearchesTitle, b = m === void 0 ? "Favorite" : m, h = r.removeFavoriteSearchButtonTitle, v = h === void 0 ? "Remove this search from favorites" : h;
  return n.state.status === "idle" && n.hasCollections === !1 ? n.disableUserPersonalization ? null : /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-StartScreen"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("p", {
    className: "DocSearch-Help"
  }, l)) : n.hasCollections === !1 ? null : /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-Dropdown-Container"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(ut, Be({}, n, {
    title: a,
    collection: n.state.collections[0],
    renderIcon: function() {
      return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
        className: "DocSearch-Hit-icon"
      }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(va, null));
    },
    renderAction: function(g) {
      var d = g.item, S = g.runFavoriteTransition, E = g.runDeleteTransition;
      return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
        className: "DocSearch-Hit-action"
      }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", {
        className: "DocSearch-Hit-action-button",
        title: s,
        type: "submit",
        onClick: function(P) {
          P.preventDefault(), P.stopPropagation(), S(function() {
            n.favoriteSearches.add(d), n.recentSearches.remove(d), n.refresh();
          });
        }
      }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Qt, null))), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
        className: "DocSearch-Hit-action"
      }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", {
        className: "DocSearch-Hit-action-button",
        title: f,
        type: "submit",
        onClick: function(P) {
          P.preventDefault(), P.stopPropagation(), E(function() {
            n.recentSearches.remove(d), n.refresh();
          });
        }
      }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(ct, null))));
    }
  })), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(ut, Be({}, n, {
    title: b,
    collection: n.state.collections[1],
    renderIcon: function() {
      return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
        className: "DocSearch-Hit-icon"
      }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Qt, null));
    },
    renderAction: function(g) {
      var d = g.item, S = g.runDeleteTransition;
      return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
        className: "DocSearch-Hit-action"
      }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", {
        className: "DocSearch-Hit-action-button",
        title: v,
        type: "submit",
        onClick: function(I) {
          I.preventDefault(), I.stopPropagation(), S(function() {
            n.favoriteSearches.remove(d), n.refresh();
          });
        }
      }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(ct, null)));
    }
  })));
}
var Qa = ["translations"];
function Ke() {
  return Ke = Object.assign || function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r)
        Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
    }
    return e;
  }, Ke.apply(this, arguments);
}
function Ga(e, t) {
  if (e == null)
    return {};
  var r = Za(e, t), n, o;
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (o = 0; o < a.length; o++)
      n = a[o], !(t.indexOf(n) >= 0) && Object.prototype.propertyIsEnumerable.call(e, n) && (r[n] = e[n]);
  }
  return r;
}
function Za(e, t) {
  if (e == null)
    return {};
  var r = {}, n = Object.keys(e), o, a;
  for (a = 0; a < n.length; a++)
    o = n[a], !(t.indexOf(o) >= 0) && (r[o] = e[o]);
  return r;
}
var Ya = react__WEBPACK_IMPORTED_MODULE_0__.memo(function(e) {
  var t = e.translations, r = t === void 0 ? {} : t, n = Ga(e, Qa);
  if (n.state.status === "error")
    return /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Pa, {
      translations: r == null ? void 0 : r.errorScreen
    });
  var o = n.state.collections.some(function(a) {
    return a.items.length > 0;
  });
  return n.state.query ? o === !1 ? /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Ta, Ke({}, n, {
    translations: r == null ? void 0 : r.noResultsScreen
  })) : /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Ua, n) : /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Ja, Ke({}, n, {
    hasCollections: o,
    translations: r == null ? void 0 : r.startScreen
  }));
}, function(t, r) {
  return r.state.status === "loading" || r.state.status === "stalled";
}), Xa = ["translations"];
function Ue() {
  return Ue = Object.assign || function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r)
        Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
    }
    return e;
  }, Ue.apply(this, arguments);
}
function ei(e, t) {
  if (e == null)
    return {};
  var r = ti(e, t), n, o;
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (o = 0; o < a.length; o++)
      n = a[o], !(t.indexOf(n) >= 0) && Object.prototype.propertyIsEnumerable.call(e, n) && (r[n] = e[n]);
  }
  return r;
}
function ti(e, t) {
  if (e == null)
    return {};
  var r = {}, n = Object.keys(e), o, a;
  for (a = 0; a < n.length; a++)
    o = n[a], !(t.indexOf(o) >= 0) && (r[o] = e[o]);
  return r;
}
function ri(e) {
  var t = e.translations, r = t === void 0 ? {} : t, n = ei(e, Xa), o = r.resetButtonTitle, a = o === void 0 ? "Clear the query" : o, c = r.resetButtonAriaLabel, l = c === void 0 ? "Clear the query" : c, u = r.cancelButtonText, s = u === void 0 ? "Cancel" : u, p = r.cancelButtonAriaLabel, f = p === void 0 ? "Cancel" : p, m = r.searchInputLabel, b = m === void 0 ? "Search" : m, h = n.getFormProps({
    inputElement: n.inputRef.current
  }), v = h.onReset;
  return react__WEBPACK_IMPORTED_MODULE_0__.useEffect(function() {
    n.autoFocus && n.inputRef.current && n.inputRef.current.focus();
  }, [n.autoFocus, n.inputRef]), react__WEBPACK_IMPORTED_MODULE_0__.useEffect(function() {
    n.isFromSelection && n.inputRef.current && n.inputRef.current.select();
  }, [n.isFromSelection, n.inputRef]), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("form", {
    className: "DocSearch-Form",
    onSubmit: function(g) {
      g.preventDefault();
    },
    onReset: v
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("label", Ue({
    className: "DocSearch-MagnifierLabel"
  }, n.getLabelProps()), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(_SearchBar_Bc6dn_HP_js__WEBPACK_IMPORTED_MODULE_1__.b, null), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", {
    className: "DocSearch-VisuallyHiddenForAccessibility"
  }, b)), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-LoadingIndicator"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(da, null)), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("input", Ue({
    className: "DocSearch-Input",
    ref: n.inputRef
  }, n.getInputProps({
    inputElement: n.inputRef.current,
    autoFocus: n.autoFocus,
    maxLength: br
  }))), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", {
    type: "reset",
    title: a,
    className: "DocSearch-Reset",
    "aria-label": l,
    hidden: !n.state.query
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(ct, null))), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", {
    className: "DocSearch-Cancel",
    type: "reset",
    "aria-label": f,
    onClick: n.onClose
  }, s));
}
var ni = ["_highlightResult", "_snippetResult"];
function oi(e, t) {
  if (e == null)
    return {};
  var r = ai(e, t), n, o;
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (o = 0; o < a.length; o++)
      n = a[o], !(t.indexOf(n) >= 0) && Object.prototype.propertyIsEnumerable.call(e, n) && (r[n] = e[n]);
  }
  return r;
}
function ai(e, t) {
  if (e == null)
    return {};
  var r = {}, n = Object.keys(e), o, a;
  for (a = 0; a < n.length; a++)
    o = n[a], !(t.indexOf(o) >= 0) && (r[o] = e[o]);
  return r;
}
function ii() {
  var e = "__TEST_KEY__";
  try {
    return localStorage.setItem(e, ""), localStorage.removeItem(e), !0;
  } catch {
    return !1;
  }
}
function ci(e) {
  return ii() === !1 ? {
    setItem: function() {
    },
    getItem: function() {
      return [];
    }
  } : {
    setItem: function(r) {
      return window.localStorage.setItem(e, JSON.stringify(r));
    },
    getItem: function() {
      var r = window.localStorage.getItem(e);
      return r ? JSON.parse(r) : [];
    }
  };
}
function nr(e) {
  var t = e.key, r = e.limit, n = r === void 0 ? 5 : r, o = ci(t), a = o.getItem().slice(0, n);
  return {
    add: function(l) {
      var u = l;
      u._highlightResult, u._snippetResult;
      var s = oi(u, ni), p = a.findIndex(function(f) {
        return f.objectID === s.objectID;
      });
      p > -1 && a.splice(p, 1), a.unshift(s), a = a.slice(0, n), o.setItem(a);
    },
    remove: function(l) {
      a = a.filter(function(u) {
        return u.objectID !== l.objectID;
      }), o.setItem(a);
    },
    getAll: function() {
      return a;
    }
  };
}
function li(e) {
  const t = `algoliasearch-client-js-${e.key}`;
  let r;
  const n = () => (r === void 0 && (r = e.localStorage || window.localStorage), r), o = () => JSON.parse(n().getItem(t) || "{}"), a = (l) => {
    n().setItem(t, JSON.stringify(l));
  }, c = () => {
    const l = e.timeToLive ? e.timeToLive * 1e3 : null, u = o(), s = Object.fromEntries(Object.entries(u).filter(([, f]) => f.timestamp !== void 0));
    if (a(s), !l)
      return;
    const p = Object.fromEntries(Object.entries(s).filter(([, f]) => {
      const m = (/* @__PURE__ */ new Date()).getTime();
      return !(f.timestamp + l < m);
    }));
    a(p);
  };
  return {
    get(l, u, s = {
      miss: () => Promise.resolve()
    }) {
      return Promise.resolve().then(() => {
        c();
        const p = JSON.stringify(l);
        return o()[p];
      }).then((p) => Promise.all([p ? p.value : u(), p !== void 0])).then(([p, f]) => Promise.all([p, f || s.miss(p)])).then(([p]) => p);
    },
    set(l, u) {
      return Promise.resolve().then(() => {
        const s = o();
        return s[JSON.stringify(l)] = {
          timestamp: (/* @__PURE__ */ new Date()).getTime(),
          value: u
        }, n().setItem(t, JSON.stringify(s)), u;
      });
    },
    delete(l) {
      return Promise.resolve().then(() => {
        const u = o();
        delete u[JSON.stringify(l)], n().setItem(t, JSON.stringify(u));
      });
    },
    clear() {
      return Promise.resolve().then(() => {
        n().removeItem(t);
      });
    }
  };
}
function fe(e) {
  const t = [...e.caches], r = t.shift();
  return r === void 0 ? ui() : {
    get(n, o, a = {
      miss: () => Promise.resolve()
    }) {
      return r.get(n, o, a).catch(() => fe({ caches: t }).get(n, o, a));
    },
    set(n, o) {
      return r.set(n, o).catch(() => fe({ caches: t }).set(n, o));
    },
    delete(n) {
      return r.delete(n).catch(() => fe({ caches: t }).delete(n));
    },
    clear() {
      return r.clear().catch(() => fe({ caches: t }).clear());
    }
  };
}
function ui() {
  return {
    get(e, t, r = {
      miss: () => Promise.resolve()
    }) {
      return t().then((o) => Promise.all([o, r.miss(o)])).then(([o]) => o);
    },
    set(e, t) {
      return Promise.resolve(t);
    },
    delete(e) {
      return Promise.resolve();
    },
    clear() {
      return Promise.resolve();
    }
  };
}
function Xe(e = { serializable: !0 }) {
  let t = {};
  return {
    get(r, n, o = {
      miss: () => Promise.resolve()
    }) {
      const a = JSON.stringify(r);
      if (a in t)
        return Promise.resolve(e.serializable ? JSON.parse(t[a]) : t[a]);
      const c = n(), l = o && o.miss || (() => Promise.resolve());
      return c.then((u) => l(u)).then(() => c);
    },
    set(r, n) {
      return t[JSON.stringify(r)] = e.serializable ? JSON.stringify(n) : n, Promise.resolve(n);
    },
    delete(r) {
      return delete t[JSON.stringify(r)], Promise.resolve();
    },
    clear() {
      return t = {}, Promise.resolve();
    }
  };
}
function si(e, t, r) {
  const n = {
    "x-algolia-api-key": r,
    "x-algolia-application-id": t
  };
  return {
    headers() {
      return e === Ve.WithinHeaders ? n : {};
    },
    queryParameters() {
      return e === Ve.WithinQueryParameters ? n : {};
    }
  };
}
function fi(e) {
  let t = e.length - 1;
  for (t; t > 0; t--) {
    const r = Math.floor(Math.random() * (t + 1)), n = e[t];
    e[t] = e[r], e[r] = n;
  }
  return e;
}
function Ir(e, t) {
  return t && Object.keys(t).forEach((r) => {
    e[r] = t[r](e);
  }), e;
}
function We(e, ...t) {
  let r = 0;
  return e.replace(/%s/g, () => encodeURIComponent(t[r++]));
}
const ft = "4.23.3", Ve = {
  /**
   * If auth credentials should be in query parameters.
   */
  WithinQueryParameters: 0,
  /**
   * If auth credentials should be in headers.
   */
  WithinHeaders: 1
};
function or(e, t) {
  const r = e || {}, n = r.data || {};
  return Object.keys(r).forEach((o) => {
    ["timeout", "headers", "queryParameters", "data", "cacheable"].indexOf(o) === -1 && (n[o] = r[o]);
  }), {
    data: Object.entries(n).length > 0 ? n : void 0,
    timeout: r.timeout || t,
    headers: r.headers || {},
    queryParameters: r.queryParameters || {},
    cacheable: r.cacheable
  };
}
const ne = {
  /**
   * If the host is read only.
   */
  Read: 1,
  /**
   * If the host is write only.
   */
  Write: 2,
  /**
   * If the host is both read and write.
   */
  Any: 3
}, _e = {
  Up: 1,
  Down: 2,
  Timeouted: 3
}, Pr = 2 * 60 * 1e3;
function wr(e, t = _e.Up) {
  return {
    ...e,
    status: t,
    lastUpdate: Date.now()
  };
}
function mi(e) {
  return e.status === _e.Up || Date.now() - e.lastUpdate > Pr;
}
function pi(e) {
  return e.status === _e.Timeouted && Date.now() - e.lastUpdate <= Pr;
}
function Er(e) {
  return typeof e == "string" ? {
    protocol: "https",
    url: e,
    accept: ne.Any
  } : {
    protocol: e.protocol || "https",
    url: e.url,
    accept: e.accept || ne.Any
  };
}
const F = {
  Delete: "DELETE",
  Get: "GET",
  Post: "POST",
  Put: "PUT"
};
function di(e, t) {
  return Promise.all(t.map((r) => e.get(r, () => Promise.resolve(wr(r))))).then((r) => {
    const n = r.filter((l) => mi(l)), o = r.filter((l) => pi(l)), a = [...n, ...o], c = a.length > 0 ? a.map((l) => Er(l)) : t;
    return {
      getTimeout(l, u) {
        return (o.length === 0 && l === 0 ? 1 : o.length + 3 + l) * u;
      },
      statelessHosts: c
    };
  });
}
const vi = ({ isTimedOut: e, status: t }) => !e && ~~t === 0, hi = (e) => {
  const t = e.status;
  return e.isTimedOut || vi(e) || ~~(t / 100) !== 2 && ~~(t / 100) !== 4;
}, yi = ({ status: e }) => ~~(e / 100) === 2, gi = (e, t) => hi(e) ? t.onRetry(e) : yi(e) ? t.onSuccess(e) : t.onFail(e);
function ar(e, t, r, n) {
  const o = [], a = wi(r, n), c = Ei(e, n), l = r.method, u = r.method !== F.Get ? {} : {
    ...r.data,
    ...n.data
  }, s = {
    "x-algolia-agent": e.userAgent.value,
    ...e.queryParameters,
    ...u,
    ...n.queryParameters
  };
  let p = 0;
  const f = (m, b) => {
    const h = m.pop();
    if (h === void 0)
      throw Ai(ir(o));
    const v = {
      data: a,
      headers: c,
      method: l,
      url: Pi(h, r.path, s),
      connectTimeout: b(p, e.timeouts.connect),
      responseTimeout: b(p, n.timeout)
    }, y = (d) => {
      const S = {
        request: v,
        response: d,
        host: h,
        triesLeft: m.length
      };
      return o.push(S), S;
    }, g = {
      onSuccess: (d) => Oi(d),
      onRetry(d) {
        const S = y(d);
        return d.isTimedOut && p++, Promise.all([
          /**
           * Failures are individually send the logger, allowing
           * the end user to debug / store stack frames even
           * when a retry error does not happen.
           */
          e.logger.info("Retryable failure", _r(S)),
          /**
           * We also store the state of the host in failure cases. If the host, is
           * down it will remain down for the next 2 minutes. In a timeout situation,
           * this host will be added end of the list of hosts on the next request.
           */
          e.hostsCache.set(h, wr(h, d.isTimedOut ? _e.Timeouted : _e.Down))
        ]).then(() => f(m, b));
      },
      onFail(d) {
        throw y(d), Ii(d, ir(o));
      }
    };
    return e.requester.send(v).then((d) => gi(d, g));
  };
  return di(e.hostsCache, t).then((m) => f([...m.statelessHosts].reverse(), m.getTimeout));
}
function bi(e) {
  const { hostsCache: t, logger: r, requester: n, requestsCache: o, responsesCache: a, timeouts: c, userAgent: l, hosts: u, queryParameters: s, headers: p } = e, f = {
    hostsCache: t,
    logger: r,
    requester: n,
    requestsCache: o,
    responsesCache: a,
    timeouts: c,
    userAgent: l,
    headers: p,
    queryParameters: s,
    hosts: u.map((m) => Er(m)),
    read(m, b) {
      const h = or(b, f.timeouts.read), v = () => ar(f, f.hosts.filter((d) => (d.accept & ne.Read) !== 0), m, h);
      if ((h.cacheable !== void 0 ? h.cacheable : m.cacheable) !== !0)
        return v();
      const g = {
        request: m,
        mappedRequestOptions: h,
        transporter: {
          queryParameters: f.queryParameters,
          headers: f.headers
        }
      };
      return f.responsesCache.get(g, () => f.requestsCache.get(g, () => f.requestsCache.set(g, v()).then((d) => Promise.all([f.requestsCache.delete(g), d]), (d) => Promise.all([f.requestsCache.delete(g), Promise.reject(d)])).then(([d, S]) => S)), {
        /**
         * Of course, once we get this response back from the server, we
         * tell response cache to actually store the received response
         * to be used later.
         */
        miss: (d) => f.responsesCache.set(g, d)
      });
    },
    write(m, b) {
      return ar(f, f.hosts.filter((h) => (h.accept & ne.Write) !== 0), m, or(b, f.timeouts.write));
    }
  };
  return f;
}
function Si(e) {
  const t = {
    value: `Algolia for JavaScript (${e})`,
    add(r) {
      const n = `; ${r.segment}${r.version !== void 0 ? ` (${r.version})` : ""}`;
      return t.value.indexOf(n) === -1 && (t.value = `${t.value}${n}`), t;
    }
  };
  return t;
}
function Oi(e) {
  try {
    return JSON.parse(e.content);
  } catch (t) {
    throw _i(t.message, e);
  }
}
function Ii({ content: e, status: t }, r) {
  let n = e;
  try {
    n = JSON.parse(e).message;
  } catch {
  }
  return ji(n, t, r);
}
function Pi(e, t, r) {
  const n = jr(r);
  let o = `${e.protocol}://${e.url}/${t.charAt(0) === "/" ? t.substr(1) : t}`;
  return n.length && (o += `?${n}`), o;
}
function jr(e) {
  const t = (r) => Object.prototype.toString.call(r) === "[object Object]" || Object.prototype.toString.call(r) === "[object Array]";
  return Object.keys(e).map((r) => We("%s=%s", r, t(e[r]) ? JSON.stringify(e[r]) : e[r])).join("&");
}
function wi(e, t) {
  if (e.method === F.Get || e.data === void 0 && t.data === void 0)
    return;
  const r = Array.isArray(e.data) ? e.data : { ...e.data, ...t.data };
  return JSON.stringify(r);
}
function Ei(e, t) {
  const r = {
    ...e.headers,
    ...t.headers
  }, n = {};
  return Object.keys(r).forEach((o) => {
    const a = r[o];
    n[o.toLowerCase()] = a;
  }), n;
}
function ir(e) {
  return e.map((t) => _r(t));
}
function _r(e) {
  const t = e.request.headers["x-algolia-api-key"] ? { "x-algolia-api-key": "*****" } : {};
  return {
    ...e,
    request: {
      ...e.request,
      headers: {
        ...e.request.headers,
        ...t
      }
    }
  };
}
function ji(e, t, r) {
  return {
    name: "ApiError",
    message: e,
    status: t,
    transporterStackTrace: r
  };
}
function _i(e, t) {
  return {
    name: "DeserializationError",
    message: e,
    response: t
  };
}
function Ai(e) {
  return {
    name: "RetryError",
    message: "Unreachable hosts - your application id may be incorrect. If the error persists, contact support@algolia.com.",
    transporterStackTrace: e
  };
}
const $i = (e) => {
  const t = e.appId, r = si(e.authMode !== void 0 ? e.authMode : Ve.WithinHeaders, t, e.apiKey), n = bi({
    hosts: [
      { url: `${t}-dsn.algolia.net`, accept: ne.Read },
      { url: `${t}.algolia.net`, accept: ne.Write }
    ].concat(fi([
      { url: `${t}-1.algolianet.com` },
      { url: `${t}-2.algolianet.com` },
      { url: `${t}-3.algolianet.com` }
    ])),
    ...e,
    headers: {
      ...r.headers(),
      "content-type": "application/x-www-form-urlencoded",
      ...e.headers
    },
    queryParameters: {
      ...r.queryParameters(),
      ...e.queryParameters
    }
  });
  return Ir({
    transporter: n,
    appId: t,
    addAlgoliaAgent(a, c) {
      n.userAgent.add({ segment: a, version: c });
    },
    clearCache() {
      return Promise.all([
        n.requestsCache.clear(),
        n.responsesCache.clear()
      ]).then(() => {
      });
    }
  }, e.methods);
}, Di = (e) => (t, r) => t.method === F.Get ? e.transporter.read(t, r) : e.transporter.write(t, r), Ar = (e) => (t, r = {}) => {
  const n = {
    transporter: e.transporter,
    appId: e.appId,
    indexName: t
  };
  return Ir(n, r.methods);
}, cr = (e) => (t, r) => {
  const n = t.map((o) => ({
    ...o,
    params: jr(o.params || {})
  }));
  return e.transporter.read({
    method: F.Post,
    path: "1/indexes/*/queries",
    data: {
      requests: n
    },
    cacheable: !0
  }, r);
}, lr = (e) => (t, r) => Promise.all(t.map((n) => {
  const { facetName: o, facetQuery: a, ...c } = n.params;
  return Ar(e)(n.indexName, {
    methods: { searchForFacetValues: $r }
  }).searchForFacetValues(o, a, {
    ...r,
    ...c
  });
})), Ci = (e) => (t, r, n) => e.transporter.read({
  method: F.Post,
  path: We("1/answers/%s/prediction", e.indexName),
  data: {
    query: t,
    queryLanguages: r
  },
  cacheable: !0
}, n), Ti = (e) => (t, r) => e.transporter.read({
  method: F.Post,
  path: We("1/indexes/%s/query", e.indexName),
  data: {
    query: t
  },
  cacheable: !0
}, r), $r = (e) => (t, r, n) => e.transporter.read({
  method: F.Post,
  path: We("1/indexes/%s/facets/%s/query", e.indexName, t),
  data: {
    facetQuery: r
  },
  cacheable: !0
}, n);
function xi(e) {
  return {
    debug(t, r) {
      return Promise.resolve();
    },
    info(t, r) {
      return Promise.resolve();
    },
    error(t, r) {
      return console.error(t, r), Promise.resolve();
    }
  };
}
const Ri = (e) => (t, r) => {
  const n = t.map((o) => ({
    ...o,
    // The `threshold` param is required by the endpoint to make it easier
    // to provide a default value later, so we default it in the client
    // so that users don't have to provide a value.
    threshold: o.threshold || 0
  }));
  return e.transporter.read({
    method: F.Post,
    path: "1/indexes/*/recommendations",
    data: {
      requests: n
    },
    cacheable: !0
  }, r);
};
function Ni() {
  return {
    send(e) {
      return new Promise((t) => {
        const r = new XMLHttpRequest();
        r.open(e.method, e.url, !0), Object.keys(e.headers).forEach((c) => r.setRequestHeader(c, e.headers[c]));
        const n = (c, l) => setTimeout(() => {
          r.abort(), t({
            status: 0,
            content: l,
            isTimedOut: !0
          });
        }, c * 1e3), o = n(e.connectTimeout, "Connection timeout");
        let a;
        r.onreadystatechange = () => {
          r.readyState > r.OPENED && a === void 0 && (clearTimeout(o), a = n(e.responseTimeout, "Socket timeout"));
        }, r.onerror = () => {
          r.status === 0 && (clearTimeout(o), clearTimeout(a), t({
            content: r.responseText || "Network request failed",
            status: r.status,
            isTimedOut: !1
          }));
        }, r.onload = () => {
          clearTimeout(o), clearTimeout(a), t({
            content: r.responseText,
            status: r.status,
            isTimedOut: !1
          });
        }, r.send(e.data);
      });
    }
  };
}
function Dr(e, t, r) {
  const n = {
    appId: e,
    apiKey: t,
    timeouts: {
      connect: 1,
      read: 2,
      write: 30
    },
    requester: Ni(),
    logger: xi(),
    responsesCache: Xe(),
    requestsCache: Xe({ serializable: !1 }),
    hostsCache: fe({
      caches: [
        li({ key: `${ft}-${e}` }),
        Xe()
      ]
    }),
    userAgent: Si(ft).add({
      segment: "Browser",
      version: "lite"
    }),
    authMode: Ve.WithinQueryParameters
  };
  return $i({
    ...n,
    ...r,
    methods: {
      search: cr,
      searchForFacetValues: lr,
      multipleQueries: cr,
      multipleSearchForFacetValues: lr,
      customRequest: Di,
      initIndex: (o) => (a) => Ar(o)(a, {
        methods: { search: Ti, searchForFacetValues: $r, findAnswers: Ci }
      }),
      getRecommendations: Ri
    }
  });
}
Dr.version = ft;
var ur = "3.6.0";
function Li(e, t, r) {
  var n = react__WEBPACK_IMPORTED_MODULE_0__.useMemo(function() {
    var o = Dr(e, t);
    return o.addAlgoliaAgent("docsearch", ur), /docsearch.js \(.*\)/.test(o.transporter.userAgent.value) === !1 && o.addAlgoliaAgent("docsearch-react", ur), r(o);
  }, [e, t, r]);
  return n;
}
function Mi(e) {
  var t = e.getEnvironmentProps, r = e.panelElement, n = e.formElement, o = e.inputElement;
  react__WEBPACK_IMPORTED_MODULE_0__.useEffect(function() {
    if (r && n && o) {
      var a = t({
        panelElement: r,
        formElement: n,
        inputElement: o
      }), c = a.onTouchStart, l = a.onTouchMove;
      return window.addEventListener("touchstart", c), window.addEventListener("touchmove", l), function() {
        window.removeEventListener("touchstart", c), window.removeEventListener("touchmove", l);
      };
    }
  }, [t, r, n, o]);
}
function ki(e) {
  var t = e.container;
  react__WEBPACK_IMPORTED_MODULE_0__.useEffect(function() {
    if (!t)
      return;
    var r = t.querySelectorAll("a[href]:not([disabled]), button:not([disabled]), input:not([disabled])"), n = r[0], o = r[r.length - 1];
    function a(c) {
      c.key === "Tab" && (c.shiftKey ? document.activeElement === n && (c.preventDefault(), o.focus()) : document.activeElement === o && (c.preventDefault(), n.focus()));
    }
    return t.addEventListener("keydown", a), function() {
      t.removeEventListener("keydown", a);
    };
  }, [t]);
}
var Hi = ["footer", "searchBox"];
function me() {
  return me = Object.assign || function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r)
        Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
    }
    return e;
  }, me.apply(this, arguments);
}
function sr(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function et(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? sr(Object(r), !0).forEach(function(n) {
      qi(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : sr(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function qi(e, t, r) {
  return t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function Fi(e, t) {
  return Vi(e) || Ui(e, t) || Ki(e, t) || Bi();
}
function Bi() {
  throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function Ki(e, t) {
  if (e) {
    if (typeof e == "string")
      return fr(e, t);
    var r = Object.prototype.toString.call(e).slice(8, -1);
    if (r === "Object" && e.constructor && (r = e.constructor.name), r === "Map" || r === "Set")
      return Array.from(e);
    if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))
      return fr(e, t);
  }
}
function fr(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var r = 0, n = new Array(t); r < t; r++)
    n[r] = e[r];
  return n;
}
function Ui(e, t) {
  var r = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
  if (r != null) {
    var n = [], o = !0, a = !1, c, l;
    try {
      for (r = r.call(e); !(o = (c = r.next()).done) && (n.push(c.value), !(t && n.length === t)); o = !0)
        ;
    } catch (u) {
      a = !0, l = u;
    } finally {
      try {
        !o && r.return != null && r.return();
      } finally {
        if (a)
          throw l;
      }
    }
    return n;
  }
}
function Vi(e) {
  if (Array.isArray(e))
    return e;
}
function Wi(e, t) {
  if (e == null)
    return {};
  var r = zi(e, t), n, o;
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (o = 0; o < a.length; o++)
      n = a[o], !(t.indexOf(n) >= 0) && Object.prototype.propertyIsEnumerable.call(e, n) && (r[n] = e[n]);
  }
  return r;
}
function zi(e, t) {
  if (e == null)
    return {};
  var r = {}, n = Object.keys(e), o, a;
  for (a = 0; a < n.length; a++)
    o = n[a], !(t.indexOf(o) >= 0) && (r[o] = e[o]);
  return r;
}
function Gi(e) {
  var t = e.appId, r = e.apiKey, n = e.indexName, o = e.placeholder, a = o === void 0 ? "Search docs" : o, c = e.searchParameters, l = e.maxResultsPerGroup, u = e.onClose, s = u === void 0 ? Ba : u, p = e.transformItems, f = p === void 0 ? rr : p, m = e.hitComponent, b = m === void 0 ? pa : m, h = e.resultsFooterComponent, v = h === void 0 ? function() {
    return null;
  } : h, y = e.navigator, g = e.initialScrollY, d = g === void 0 ? 0 : g, S = e.transformSearchClient, E = S === void 0 ? rr : S, I = e.disableUserPersonalization, P = I === void 0 ? !1 : I, A = e.initialQuery, $ = A === void 0 ? "" : A, N = e.translations, D = N === void 0 ? {} : N, M = e.getMissingResultsUrl, mt = e.insights, ze = mt === void 0 ? !1 : mt, Cr = D.footer, Tr = D.searchBox, xr = Wi(D, Hi), Rr = react__WEBPACK_IMPORTED_MODULE_0__.useState({
    query: "",
    collections: [],
    completion: null,
    context: {},
    isOpen: !1,
    activeItemId: null,
    status: "idle"
  }), pt = Fi(Rr, 2), k = pt[0], Nr = pt[1], dt = react__WEBPACK_IMPORTED_MODULE_0__.useRef(null), Je = react__WEBPACK_IMPORTED_MODULE_0__.useRef(null), vt = react__WEBPACK_IMPORTED_MODULE_0__.useRef(null), Ae = react__WEBPACK_IMPORTED_MODULE_0__.useRef(null), oe = react__WEBPACK_IMPORTED_MODULE_0__.useRef(null), H = react__WEBPACK_IMPORTED_MODULE_0__.useRef(10), ht = react__WEBPACK_IMPORTED_MODULE_0__.useRef(typeof window < "u" ? window.getSelection().toString().slice(0, br) : "").current, B = react__WEBPACK_IMPORTED_MODULE_0__.useRef($ || ht).current, yt = Li(t, r, E), z = react__WEBPACK_IMPORTED_MODULE_0__.useRef(nr({
    key: "__DOCSEARCH_FAVORITE_SEARCHES__".concat(n),
    limit: 10
  })).current, ae = react__WEBPACK_IMPORTED_MODULE_0__.useRef(nr({
    key: "__DOCSEARCH_RECENT_SEARCHES__".concat(n),
    // We display 7 recent searches and there's no favorites, but only
    // 4 when there are favorites.
    limit: z.getAll().length === 0 ? 7 : 4
  })).current, ie = react__WEBPACK_IMPORTED_MODULE_0__.useCallback(function(w) {
    if (!P) {
      var x = w.type === "content" ? w.__docsearch_parent : w;
      x && z.getAll().findIndex(function(Qe) {
        return Qe.objectID === x.objectID;
      }) === -1 && ae.add(x);
    }
  }, [z, ae, P]), Lr = react__WEBPACK_IMPORTED_MODULE_0__.useCallback(function(j) {
    if (!(!k.context.algoliaInsightsPlugin || !j.__autocomplete_id)) {
      var w = j, x = {
        eventName: "Item Selected",
        index: w.__autocomplete_indexName,
        items: [w],
        positions: [j.__autocomplete_id],
        queryID: w.__autocomplete_queryID
      };
      k.context.algoliaInsightsPlugin.insights.clickedObjectIDsAfterSearch(x);
    }
  }, [k.context.algoliaInsightsPlugin]), ce = react__WEBPACK_IMPORTED_MODULE_0__.useMemo(function() {
    return sa({
      id: "docsearch",
      defaultActiveItemId: 0,
      placeholder: a,
      openOnFocus: !0,
      initialState: {
        query: B,
        context: {
          searchSuggestions: []
        }
      },
      insights: ze,
      navigator: y,
      onStateChange: function(w) {
        Nr(w.state);
      },
      getSources: function(w) {
        var x = w.query, Qe = w.state, bt = w.setContext, Hr = w.setStatus;
        if (!x)
          return P ? [] : [{
            sourceId: "recentSearches",
            onSelect: function(C) {
              var T = C.item, le = C.event;
              ie(T), Me(le) || s();
            },
            getItemUrl: function(C) {
              var T = C.item;
              return T.url;
            },
            getItems: function() {
              return ae.getAll();
            }
          }, {
            sourceId: "favoriteSearches",
            onSelect: function(C) {
              var T = C.item, le = C.event;
              ie(T), Me(le) || s();
            },
            getItemUrl: function(C) {
              var T = C.item;
              return T.url;
            },
            getItems: function() {
              return z.getAll();
            }
          }];
        var St = !!ze;
        return yt.search([{
          query: x,
          indexName: n,
          params: et({
            attributesToRetrieve: ["hierarchy.lvl0", "hierarchy.lvl1", "hierarchy.lvl2", "hierarchy.lvl3", "hierarchy.lvl4", "hierarchy.lvl5", "hierarchy.lvl6", "content", "type", "url"],
            attributesToSnippet: ["hierarchy.lvl1:".concat(H.current), "hierarchy.lvl2:".concat(H.current), "hierarchy.lvl3:".concat(H.current), "hierarchy.lvl4:".concat(H.current), "hierarchy.lvl5:".concat(H.current), "hierarchy.lvl6:".concat(H.current), "content:".concat(H.current)],
            snippetEllipsisText: "…",
            highlightPreTag: "<mark>",
            highlightPostTag: "</mark>",
            hitsPerPage: 20,
            clickAnalytics: St
          }, c)
        }]).catch(function(R) {
          throw R.name === "RetryError" && Hr("error"), R;
        }).then(function(R) {
          var C = R.results, T = C[0], le = T.hits, qr = T.nbHits, Ge = tr(le, function(Ze) {
            return Or(Ze);
          }, l);
          Qe.context.searchSuggestions.length < Object.keys(Ge).length && bt({
            searchSuggestions: Object.keys(Ge)
          }), bt({
            nbHits: qr
          });
          var Ot = {};
          return St && (Ot = {
            __autocomplete_indexName: n,
            __autocomplete_queryID: T.queryID,
            __autocomplete_algoliaCredentials: {
              appId: t,
              apiKey: r
            }
          }), Object.values(Ge).map(function(Ze, Fr) {
            return {
              sourceId: "hits".concat(Fr),
              onSelect: function(L) {
                var K = L.item, $e = L.event;
                ie(K), Me($e) || s();
              },
              getItemUrl: function(L) {
                var K = L.item;
                return K.url;
              },
              getItems: function() {
                return Object.values(tr(Ze, function(L) {
                  return L.hierarchy.lvl1;
                }, l)).map(f).map(function(L) {
                  return L.map(function(K) {
                    var $e = null, Pt = L.find(function(wt) {
                      return wt.type === "lvl1" && wt.hierarchy.lvl1 === K.hierarchy.lvl1;
                    });
                    return K.type !== "lvl1" && Pt && ($e = Pt), et(et({}, K), {}, {
                      __docsearch_parent: $e
                    }, Ot);
                  });
                }).flat();
              }
            };
          });
        });
      }
    });
  }, [n, c, l, yt, s, ae, z, ie, B, a, y, f, P, ze, t, r]), Mr = ce.getEnvironmentProps, kr = ce.getRootProps, gt = ce.refresh;
  return Mi({
    getEnvironmentProps: Mr,
    panelElement: Ae.current,
    formElement: vt.current,
    inputElement: oe.current
  }), ki({
    container: dt.current
  }), react__WEBPACK_IMPORTED_MODULE_0__.useEffect(function() {
    return document.body.classList.add("DocSearch--active"), function() {
      var j, w;
      document.body.classList.remove("DocSearch--active"), (j = (w = window).scrollTo) === null || j === void 0 || j.call(w, 0, d);
    };
  }, []), react__WEBPACK_IMPORTED_MODULE_0__.useEffect(function() {
    var j = window.matchMedia("(max-width: 768px)");
    j.matches && (H.current = 5);
  }, []), react__WEBPACK_IMPORTED_MODULE_0__.useEffect(function() {
    Ae.current && (Ae.current.scrollTop = 0);
  }, [k.query]), react__WEBPACK_IMPORTED_MODULE_0__.useEffect(function() {
    B.length > 0 && (gt(), oe.current && oe.current.focus());
  }, [B, gt]), react__WEBPACK_IMPORTED_MODULE_0__.useEffect(function() {
    function j() {
      if (Je.current) {
        var w = window.innerHeight * 0.01;
        Je.current.style.setProperty("--docsearch-vh", "".concat(w, "px"));
      }
    }
    return j(), window.addEventListener("resize", j), function() {
      window.removeEventListener("resize", j);
    };
  }, []), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", me({
    ref: dt
  }, kr({
    "aria-expanded": !0
  }), {
    className: ["DocSearch", "DocSearch-Container", k.status === "stalled" && "DocSearch-Container--Stalled", k.status === "error" && "DocSearch-Container--Errored"].filter(Boolean).join(" "),
    role: "button",
    tabIndex: 0,
    onMouseDown: function(w) {
      w.target === w.currentTarget && s();
    }
  }), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-Modal",
    ref: Je
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("header", {
    className: "DocSearch-SearchBar",
    ref: vt
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(ri, me({}, ce, {
    state: k,
    autoFocus: B.length === 0,
    inputRef: oe,
    isFromSelection: !!B && B === ht,
    translations: Tr,
    onClose: s
  }))), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    className: "DocSearch-Dropdown",
    ref: Ae
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(Ya, me({}, ce, {
    indexName: n,
    state: k,
    hitComponent: b,
    resultsFooterComponent: v,
    disableUserPersonalization: P,
    recentSearches: ae,
    favoriteSearches: z,
    inputRef: oe,
    translations: xr,
    getMissingResultsUrl: M,
    onItemClick: function(w, x) {
      Lr(w), ie(w), Me(x) || s();
    }
  }))), /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement("footer", {
    className: "DocSearch-Footer"
  }, /* @__PURE__ */ react__WEBPACK_IMPORTED_MODULE_0__.createElement(ma, {
    translations: Cr
  }))));
}



/***/ })

};
;