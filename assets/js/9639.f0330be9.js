"use strict";(self.webpackChunkreact_native_reanimated_docs=self.webpackChunkreact_native_reanimated_docs||[]).push([[9639],{1310:(e,t,n)=>{n.d(t,{Z:()=>g});var a=n(87462),l=n(67294),s=n(86010),o=n(35281),r=n(53438),c=n(48596),i=n(39960),d=n(95999),m=n(44996);function u(e){return l.createElement("svg",(0,a.Z)({viewBox:"0 0 24 24"},e),l.createElement("path",{d:"M10 19v-5h4v5c0 .55.45 1 1 1h3c.55 0 1-.45 1-1v-7h1.7c.46 0 .68-.57.33-.87L12.67 3.6c-.38-.34-.96-.34-1.34 0l-8.36 7.53c-.34.3-.13.87.33.87H5v7c0 .55.45 1 1 1h3c.55 0 1-.45 1-1z",fill:"currentColor"}))}const v={breadcrumbHomeIcon:"breadcrumbHomeIcon_YNFT"};function h(){const e=(0,m.Z)("/");return l.createElement("li",{className:"breadcrumbs__item"},l.createElement(i.Z,{"aria-label":(0,d.I)({id:"theme.docs.breadcrumbs.home",message:"Home page",description:"The ARIA label for the home page in the breadcrumbs"}),className:"breadcrumbs__link",href:e},l.createElement(u,{className:v.breadcrumbHomeIcon})))}const b={breadcrumbsContainer:"breadcrumbsContainer_Z_bl"};function p(e){let{children:t,href:n,isLast:a}=e;const s="breadcrumbs__link";return a?l.createElement("span",{className:s,itemProp:"name"},t):n?l.createElement(i.Z,{className:s,href:n,itemProp:"item"},l.createElement("span",{itemProp:"name"},t)):l.createElement("span",{className:s},t)}function f(e){let{children:t,active:n,index:o,addMicrodata:r}=e;return l.createElement("li",(0,a.Z)({},r&&{itemScope:!0,itemProp:"itemListElement",itemType:"https://schema.org/ListItem"},{className:(0,s.default)("breadcrumbs__item",{"breadcrumbs__item--active":n})}),t,l.createElement("meta",{itemProp:"position",content:String(o+1)}))}function g(){const e=(0,r.s1)(),t=(0,c.Ns)();return e?l.createElement("nav",{className:(0,s.default)(o.k.docs.docBreadcrumbs,b.breadcrumbsContainer),"aria-label":(0,d.I)({id:"theme.docs.breadcrumbs.navAriaLabel",message:"Breadcrumbs",description:"The ARIA label for the breadcrumbs"})},l.createElement("ul",{className:"breadcrumbs",itemScope:!0,itemType:"https://schema.org/BreadcrumbList"},t&&l.createElement(h,null),e.map(((t,n)=>{const a=n===e.length-1;return l.createElement(f,{key:n,active:a,index:n,addMicrodata:!!t.href},l.createElement(p,{href:t.href,isLast:a},t.label))})))):null}},72991:(e,t,n)=>{n.r(t),n.d(t,{default:()=>A});var a=n(67294),l=n(10833),s=n(65130),o=n(59181),r=n(86010),c=n(87524),i=n(80049);function d(){const{metadata:e}=(0,s.k)();return a.createElement(i.Z,{previous:e.previous,next:e.next})}var m=n(23120),u=n(44364),v=n(35281),h=n(95999);function b(e){let{lastUpdatedAt:t,formattedLastUpdatedAt:n}=e;return a.createElement(h.Z,{id:"theme.lastUpdated.atDate",description:"The words used to describe on which date a page has been last updated",values:{date:a.createElement("b",null,a.createElement("time",{dateTime:new Date(1e3*t).toISOString()},n))}}," on {date}")}function p(e){let{lastUpdatedBy:t}=e;return a.createElement(h.Z,{id:"theme.lastUpdated.byUser",description:"The words used to describe by who the page has been last updated",values:{user:a.createElement("b",null,t)}}," by {user}")}function f(e){let{lastUpdatedAt:t,formattedLastUpdatedAt:n,lastUpdatedBy:l}=e;return a.createElement("span",{className:v.k.common.lastUpdated},a.createElement(h.Z,{id:"theme.lastUpdated.lastUpdatedAtBy",description:"The sentence used to display when a page has been last updated, and by who",values:{atDate:t&&n?a.createElement(b,{lastUpdatedAt:t,formattedLastUpdatedAt:n}):"",byUser:l?a.createElement(p,{lastUpdatedBy:l}):""}},"Last updated{atDate}{byUser}"),!1)}var g=n(84881),E=n(86233);const _={lastUpdated:"lastUpdated_vwxv"};function L(e){return a.createElement("div",{className:(0,r.default)(v.k.docs.docFooterTagsRow,"row margin-bottom--sm")},a.createElement("div",{className:"col"},a.createElement(E.Z,e)))}function C(e){let{editUrl:t,lastUpdatedAt:n,lastUpdatedBy:l,formattedLastUpdatedAt:s}=e;return a.createElement("div",{className:(0,r.default)(v.k.docs.docFooterEditMetaRow,"row")},a.createElement("div",{className:"col"},t&&a.createElement(g.Z,{editUrl:t})),a.createElement("div",{className:(0,r.default)("col",_.lastUpdated)},(n||l)&&a.createElement(f,{lastUpdatedAt:n,formattedLastUpdatedAt:s,lastUpdatedBy:l})))}function N(){const{metadata:e}=(0,s.k)(),{editUrl:t,lastUpdatedAt:n,formattedLastUpdatedAt:l,lastUpdatedBy:o,tags:c}=e,i=c.length>0,d=!!(t||n||o);return i||d?a.createElement("footer",{className:(0,r.default)(v.k.docs.docFooter,"docusaurus-mt-lg")},i&&a.createElement(L,{tags:c}),d&&a.createElement(C,{editUrl:t,lastUpdatedAt:n,lastUpdatedBy:o,formattedLastUpdatedAt:l})):null}var x=n(87449),k=n(39407);function j(){const{toc:e,frontMatter:t}=(0,s.k)();return a.createElement(k.Z,{toc:e,minHeadingLevel:t.toc_min_heading_level,maxHeadingLevel:t.toc_max_heading_level,className:v.k.docs.docTocDesktop})}var w=n(92503),y=n(15028);function Z(e){let{children:t}=e;const n=function(){const{metadata:e,frontMatter:t,contentTitle:n}=(0,s.k)();return t.hide_title||void 0!==n?null:e.title}();return a.createElement("div",{className:(0,r.default)(v.k.docs.docMarkdown,"markdown")},n&&a.createElement("header",null,a.createElement(w.Z,{as:"h1"},n)),a.createElement(y.Z,null,t))}var U=n(1310);const H={docItemContainer:"docItemContainer_Djhp",docItemCol:"docItemCol_VOVn"};function T(e){let{children:t}=e;const n=function(){const{frontMatter:e,toc:t}=(0,s.k)(),n=(0,c.i)(),l=e.hide_table_of_contents,o=!l&&t.length>0;return{hidden:l,mobile:o?a.createElement(x.Z,null):void 0,desktop:!o||"desktop"!==n&&"ssr"!==n?void 0:a.createElement(j,null)}}();return a.createElement("div",{className:"row"},a.createElement("div",{className:(0,r.default)("col",!n.hidden&&H.docItemCol)},a.createElement(m.Z,null),a.createElement("div",{className:H.docItemContainer},a.createElement("article",null,a.createElement(U.Z,null),a.createElement(u.Z,null),n.mobile,a.createElement(Z,null,t),a.createElement(N,null)),a.createElement(d,null))),n.desktop&&a.createElement("div",{className:"col col--3"},n.desktop))}function A(e){const t=`docs-doc-id-${e.content.metadata.unversionedId}`,n=e.content;return a.createElement(s.b,{content:e.content},a.createElement(l.FG,{className:t},a.createElement(o.Z,null),a.createElement(T,null,a.createElement(n,null))))}},80049:(e,t,n)=>{n.d(t,{Z:()=>r});var a=n(87462),l=n(67294),s=n(95999),o=n(54280);function r(e){const{previous:t,next:n}=e;return l.createElement("nav",{className:"pagination-nav docusaurus-mt-lg","aria-label":(0,s.I)({id:"theme.docs.paginator.navAriaLabel",message:"Docs pages",description:"The ARIA label for the docs pagination"})},t&&l.createElement(o.Z,(0,a.Z)({},t,{subLabel:l.createElement(s.Z,{id:"theme.docs.paginator.previous",description:"The label used to navigate to the previous doc"},"Previous")})),n&&l.createElement(o.Z,(0,a.Z)({},n,{subLabel:l.createElement(s.Z,{id:"theme.docs.paginator.next",description:"The label used to navigate to the next doc"},"Next"),isNext:!0})))}},44364:(e,t,n)=>{n.d(t,{Z:()=>c});var a=n(67294),l=n(86010),s=n(95999),o=n(35281),r=n(74477);function c(e){let{className:t}=e;const n=(0,r.E)();return n.badge?a.createElement("span",{className:(0,l.default)(t,o.k.docs.docVersionBadge,"badge badge--secondary")},a.createElement(s.Z,{id:"theme.docs.versionBadge.label",values:{versionLabel:n.label}},"Version: {versionLabel}")):null}},23120:(e,t,n)=>{n.d(t,{Z:()=>p});var a=n(67294),l=n(86010),s=n(52263),o=n(39960),r=n(95999),c=n(94104),i=n(35281),d=n(60373),m=n(74477);const u={unreleased:function(e){let{siteTitle:t,versionMetadata:n}=e;return a.createElement(r.Z,{id:"theme.docs.versions.unreleasedVersionLabel",description:"The label used to tell the user that he's browsing an unreleased doc version",values:{siteTitle:t,versionLabel:a.createElement("b",null,n.label)}},"This is unreleased documentation for {siteTitle} {versionLabel} version.")},unmaintained:function(e){let{siteTitle:t,versionMetadata:n}=e;return a.createElement(r.Z,{id:"theme.docs.versions.unmaintainedVersionLabel",description:"The label used to tell the user that he's browsing an unmaintained doc version",values:{siteTitle:t,versionLabel:a.createElement("b",null,n.label)}},"This is documentation for {siteTitle} {versionLabel}, which is no longer actively maintained.")}};function v(e){const t=u[e.versionMetadata.banner];return a.createElement(t,e)}function h(e){let{versionLabel:t,to:n,onClick:l}=e;return a.createElement(r.Z,{id:"theme.docs.versions.latestVersionSuggestionLabel",description:"The label used to tell the user to check the latest version",values:{versionLabel:t,latestVersionLink:a.createElement("b",null,a.createElement(o.Z,{to:n,onClick:l},a.createElement(r.Z,{id:"theme.docs.versions.latestVersionLinkLabel",description:"The label used for the latest version suggestion link label"},"latest version")))}},"For up-to-date documentation, see the {latestVersionLink} ({versionLabel}).")}function b(e){let{className:t,versionMetadata:n}=e;const{siteConfig:{title:o}}=(0,s.Z)(),{pluginId:r}=(0,c.gA)({failfast:!0}),{savePreferredVersionName:m}=(0,d.J)(r),{latestDocSuggestion:u,latestVersionSuggestion:b}=(0,c.Jo)(r),p=u??(f=b).docs.find((e=>e.id===f.mainDocId));var f;return a.createElement("div",{className:(0,l.default)(t,i.k.docs.docVersionBanner,"alert alert--warning margin-bottom--md"),role:"alert"},a.createElement("div",null,a.createElement(v,{siteTitle:o,versionMetadata:n})),a.createElement("div",{className:"margin-top--md"},a.createElement(h,{versionLabel:b.label,to:p.path,onClick:()=>m(b.name)})))}function p(e){let{className:t}=e;const n=(0,m.E)();return n.banner?a.createElement(b,{className:t,versionMetadata:n}):null}},39407:(e,t,n)=>{n.d(t,{Z:()=>d});var a=n(87462),l=n(67294),s=n(86010),o=n(31498);const r={tableOfContents:"tableOfContents_bqdL",docItemContainer:"docItemContainer_F8PC"},c="table-of-contents__link toc-highlight",i="table-of-contents__link--active";function d(e){let{className:t,...n}=e;return l.createElement("div",{className:(0,s.default)(r.tableOfContents,"thin-scrollbar",t)},l.createElement(o.Z,(0,a.Z)({},n,{linkClassName:c,linkActiveClassName:i})))}},65130:(e,t,n)=>{n.d(t,{b:()=>o,k:()=>r});var a=n(67294),l=n(902);const s=a.createContext(null);function o(e){let{children:t,content:n}=e;const l=function(e){return(0,a.useMemo)((()=>({metadata:e.metadata,frontMatter:e.frontMatter,assets:e.assets,contentTitle:e.contentTitle,toc:e.toc})),[e])}(n);return a.createElement(s.Provider,{value:l},t)}function r(){const e=(0,a.useContext)(s);if(null===e)throw new l.i6("DocProvider");return e}},72221:(e,t,n)=>{n.d(t,{n:()=>o});var a=n(36932),l=n(10833),s=n(65130);function o(){const{metadata:e,frontMatter:t}=(0,s.k)();if(!e.title)return null;const n=e.title.replace(/ /g,"-").replace("/","-").toLowerCase();return a.j.jsx(l.d,{title:e.title,description:e.description,keywords:t.keywords,image:`img/og/${""!==n&&n?n:"React Native Reanimated"}.png`})}},82114:(e,t,n)=>{n.d(t,{r:()=>b});var a=n(36932),l=n(86990),s=n(35281),o=n(65130),r=n(86043),c=n(21094),i=n(95999);const d={tocCollapsibleButton:"_tocCollapsibleButton_60uzn_1",tocCollapsibleButtonExpanded:"_tocCollapsibleButtonExpanded_60uzn_20"};function m({collapsed:e,...t}){return a.j.jsx("button",{type:"button",...t,className:(0,l.c)("clean-btn",d.tocCollapsibleButton,!e&&d.tocCollapsibleButtonExpanded,t.className),children:a.j.jsx(i.Z,{id:"theme.TOCCollapsible.toggleButtonLabel",description:"The label used by the button on the collapsible TOC component",children:"On this page"})})}const u={tocCollapsible:"_tocCollapsible_mns7p_1",tocCollapsibleContent:"_tocCollapsibleContent_mns7p_7",tocCollapsibleExpanded:"_tocCollapsibleExpanded_mns7p_22"};function v({toc:e,className:t,minHeadingLevel:n,maxHeadingLevel:s}){const{collapsed:o,toggleCollapsed:i}=(0,r.u)({initialState:!0});return a.j.jsxs("div",{className:(0,l.c)(u.tocCollapsible,!o&&u.tocCollapsibleExpanded,t),children:[a.j.jsx(m,{collapsed:o,onClick:i}),a.j.jsx(r.z,{lazy:!0,className:u.tocCollapsibleContent,collapsed:o,children:a.j.jsx(c.k,{toc:e,minHeadingLevel:n,maxHeadingLevel:s})})]})}const h={toc_mobile__wrapper:"_toc_mobile__wrapper_6l895_2"};function b(){const{toc:e,frontMatter:t}=(0,o.k)();return a.j.jsx("div",{className:h.toc_mobile__wrapper,children:a.j.jsx(v,{toc:e,minHeadingLevel:t.toc_min_heading_level,maxHeadingLevel:t.toc_max_heading_level,className:(0,l.c)(s.k.docs.docTocMobile,h.tocMobile)})})}},21094:(e,t,n)=>{n.d(t,{k:()=>C});var a=n(36932),l=n(67294),s=n(86668);function o(e){const t=e.map((e=>({...e,parentIndex:-1,children:[]}))),n=Array(7).fill(-1);t.forEach(((e,t)=>{const a=n.slice(2,e.level);e.parentIndex=Math.max(...a),n[e.level]=t}));const a=[];return t.forEach((e=>{const{parentIndex:n,...l}=e;n>=0?t[n].children.push(l):a.push(l)})),a}function r(e){let{toc:t,minHeadingLevel:n,maxHeadingLevel:a}=e;return t.flatMap((e=>{const t=r({toc:e.children,minHeadingLevel:n,maxHeadingLevel:a});return function(e){return e.level>=n&&e.level<=a}(e)?[{...e,children:t}]:t}))}function c(e){const t=e.getBoundingClientRect();return t.top===t.bottom?c(e.parentNode):t}function i(e,t){let{anchorTopOffset:n}=t;const a=e.find((e=>c(e).top>=n));if(a){return function(e){return e.top>0&&e.bottom<window.innerHeight/2}(c(a))?a:e[e.indexOf(a)-1]??null}return e[e.length-1]??null}function d(){const e=(0,l.useRef)(0),{navbar:{hideOnScroll:t}}=(0,s.L)();return(0,l.useEffect)((()=>{e.current=t?0:document.querySelector(".navbar").clientHeight}),[t]),e}function m(e){const t=(0,l.useRef)(void 0),n=d();(0,l.useEffect)((()=>{if(!e)return()=>{};const{linkClassName:a,linkActiveClassName:l,minHeadingLevel:s,maxHeadingLevel:o}=e;function r(){const e=function(e){return Array.from(document.getElementsByClassName(e))}(a),r=function(e){let{minHeadingLevel:t,maxHeadingLevel:n}=e;const a=[];for(let l=t;l<=n;l+=1)a.push(`h${l}.anchor`);return Array.from(document.querySelectorAll(a.join()))}({minHeadingLevel:s,maxHeadingLevel:o}),c=i(r,{anchorTopOffset:n.current}),d=e.find((e=>c&&c.id===function(e){return decodeURIComponent(e.href.substring(e.href.indexOf("#")+1))}(e)));e.forEach((e=>{!function(e,n){n?(t.current&&t.current!==e&&t.current.classList.remove(l),e.classList.add(l),t.current=e):e.classList.remove(l)}(e,e===d)}))}return document.addEventListener("scroll",r),document.addEventListener("resize",r),r(),()=>{document.removeEventListener("scroll",r),document.removeEventListener("resize",r)}}),[e,n])}var u=n(86990);const v={tocItems:"_tocItems_1hbbs_1",hireUsContainer:"_hireUsContainer_1hbbs_17",buttonContainer:"_buttonContainer_1hbbs_31"},h=l.memo((function e({toc:t,className:n,linkClassName:l,isChild:s}){return t.length?a.j.jsx("ul",{className:(0,u.c)(v.tocItems,s?void 0:n),children:t.map((t=>a.j.jsxs("li",{children:[a.j.jsx("a",{href:`#${t.id}`,className:l??void 0,dangerouslySetInnerHTML:{__html:`<span>${t.value}</span>`}}),a.j.jsx(e,{isChild:!0,toc:t.children,className:n,linkClassName:l})]},t.id)))}):null}));function b(e){return a.j.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"13",height:"10",fill:"none",viewBox:"0 0 13 10",...e,children:a.j.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"1.5",d:"M11.687 5h-10M7.687 9l4-4-4-4"})})}const p="_homepageButton_5eky2_1",f="_homepageButtonLink_5eky2_21",g="_arrow_5eky2_51",E="_buttonNavyStyling_5eky2_67",_="_buttonNavyBorderStyling_5eky2_91",L=({title:e,href:t,target:n="_self"})=>a.j.jsx("a",{href:t,target:n,className:f,children:a.j.jsxs("div",{className:(0,u.c)(p,E,_),children:[e,a.j.jsx("div",{className:g,children:a.j.jsx(b,{})})]})});function C({toc:e,className:t="table-of-contents table-of-contents__left-border",linkClassName:n="table-of-contents__link",linkActiveClassName:c,minHeadingLevel:i,maxHeadingLevel:d,...u}){const b=(0,s.L)(),p=i??b.tableOfContents.minHeadingLevel,f=d??b.tableOfContents.maxHeadingLevel,g=function(e){let{toc:t,minHeadingLevel:n,maxHeadingLevel:a}=e;return(0,l.useMemo)((()=>r({toc:o(t),minHeadingLevel:n,maxHeadingLevel:a})),[t,n,a])}({toc:e,minHeadingLevel:p,maxHeadingLevel:f});return m((0,l.useMemo)((()=>{if(n&&c)return{linkClassName:n,linkActiveClassName:c,minHeadingLevel:p,maxHeadingLevel:f}}),[n,c,p,f])),a.j.jsxs(a.j.Fragment,{children:[a.j.jsx(h,{toc:g,className:t,linkClassName:n,...u}),a.j.jsxs("div",{className:v.hireUsContainer,children:[a.j.jsx("p",{children:"We are Software Mansion."}),a.j.jsx("div",{className:v.buttonContainer,children:a.j.jsx(L,{href:"https://swmansion.com/contact#contact-form",title:"Hire us"})})]})]})}}}]);