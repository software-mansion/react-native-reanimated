const DEFAULT_PLATFORM = 'android';
const DEPENDENCIES = [
  'react-native-reanimated@*',
  'react-native-gesture-handler@*',
  '@shopify/flash-list@*',
];

function getSnackUrl(options) {
  let label = options.label || document.title;
  let codeId = options.templateId;

  let baseUrl =
    `https://snack.expo.io?platform=${DEFAULT_PLATFORM}&name=` +
    encodeURIComponent(label) +
    '&dependencies=' +
    encodeURIComponent(DEPENDENCIES.join(',')) +
    '&hideQueryParams=true';

  let templateUrl = `${document.location.origin}/react-native-reanimated/examples/${codeId}.js`;
  return `${baseUrl}&sourceUrl=${encodeURIComponent(templateUrl)}`;
}

let openIcon =
  '<svg width="14px" height="14px" viewBox="0 0 16 16" style="vertical-align: -1px"><g stroke="none" stroke-width="1" fill="none"><polyline stroke="currentColor" points="8.5 0.5 15.5 0.5 15.5 7.5"></polyline><path d="M8,8 L15.0710678,0.928932188" stroke="currentColor"></path><polyline stroke="currentColor" points="9.06944444 3.5 1.5 3.5 1.5 14.5 12.5 14.5 12.5 6.93055556"></polyline></g></svg>';

function appendSnackLink() {
  let samples = document.querySelectorAll('samp');

  if (!samples.length) {
    return;
  }

  samples.forEach((samp) => {
    var id = samp.getAttribute('id');

    var snackLink = document.createElement('a');
    snackLink.href = getSnackUrl({ templateId: id });
    snackLink.target = '_blank';
    snackLink.innerHTML = `Try this example on Snack ${openIcon}`;
    snackLink.className = 'snack-link';

    var nextDiv = samp.nextElementSibling;
    while (
      nextDiv &&
      !Array.from(nextDiv.classList).some((className) =>
        className.includes('codeBlockContainer')
      )
    ) {
      nextDiv = nextDiv.nextElementSibling;
    }

    if (nextDiv) {
      nextDiv.insertAdjacentElement('afterend', snackLink);
    } else {
      samp.parentNode.insertBefore(snackLink, samp.nextSibling);
    }

    samp.remove();
  });
}

function transformExistingSnackLinks() {
  document.querySelectorAll('a[href*="#example/"]').forEach((a) => {
    let urlParts = a.href.split('#example/');
    let templateId = urlParts[urlParts.length - 1];
    a.href = getSnackUrl({ templateId });
    a.target = '_blank';
  });
}

function initializeSnackObservers() {
  appendSnackLink();
  transformExistingSnackLinks();

  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach(appendSnackLink);
    mutations.forEach(transformExistingSnackLinks);
  });

  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

document.addEventListener('DOMContentLoaded', initializeSnackObservers);
