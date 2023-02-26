/* Twitter.com */

const cw1xpath = "//span[text()='Content warning: Nudity']";
const cw2xpath = "//span[text()='Content warning: Sensitive content']";
const iOptions = { rootMargin: '100px 0px 800px 0px', threshold: [0, 0.4, 0.5, 0.7, 0.8, 1] };
const tweetCache = {};
const scrollSpeed = 600;

const doc = document;
const html = doc.documentElement;
const head = doc.head;
const body = doc.body;
const store = window.localStorage;
const loc = () => window.location;
const lHref = () => window.location.href;
const lPath = () => window.location.pathname;

const qs = (query, elem = doc) => elem.querySelector(query);
const qsa = (query, elem = doc) => elem.querySelectorAll(query);
const aCld = (elem, cld) => elem.appendChild(cld);
const cAdd = (elem, classNames) => elem.classList.add(...classNames);
const cRemove = (elem, classNames) => elem.classList.remove(...classNames);
const cToggle = (elem, className, force) => elem.classList.toggle(className, force);
const pSet = (elem, prop, val) => elem.style.setProperty(prop, val);
const pDel = (elem, prop) => elem.style.removeProperty(prop);
const aSet = (elem, attr, val) => elem.setAttribute(attr, val);
const aGet = (elem, attr) => elem.getAttribute(attr);

const el = {
  tAvatar: tweet => qs('[data-testid="Tweet-User-Avatar"]', tweet),
  tMedia: tweet => qsa('[data-testid="tweetPhoto"]', tweet),
  tVids: tweet => qsa('[data-testid="tweetPhoto"] video', tweet),
  tUserName: tweet => qs('[data-testid="User-Names"]', tweet),
  tLoc: tweet => qs('[data-testid="User-Names"] a[href*="status"]', tweet)?.href.split('twitter.com/')[1],
  tWarnBtn: tweet => qs('div.css-1dbjc4n.r-drfeu3.r-1867qdf.r-1p0dtai.r-eqz5dr.r-16y2uox.r-1777fci.r-1d2f490.r-ymttw5.r-1f1sjgu.r-u8s1d.r-zchlnj.r-ipm5af div[role="button"]', tweet),
};

const toggles = {
  'owo-enabled': { className: 'owo-enabled', text: 'Enabled', state: null, tooltip: 'Enable/Disable everything' },
  'auto-scroll': { className: 'auto-scroll', text: 'Auto Scroll', state: null, tooltip: 'Auto-scroll (Start using spacebar)' },
  'collapse-likes': { className: 'collapse-likes', text: 'Collapse likes', state: null, tooltip: 'Mask liked tweets & skip when using keyboard control' },
  'small-media': { className: 'small-media', text: 'Small media', state: null, tooltip: 'Display media smaller' },
  'large-media': { className: 'large-media', text: 'Large media', state: null, tooltip: 'Display media larger' },
  'media-only': { className: 'media-only', text: 'Media only', state: null, tooltip: 'Skip text when using keyboard control' },
  'less-text': { className: 'less-text', text: 'Less text', state: null, tooltip: 'Hide some text in tweets' },
  'no-avatars': { className: 'no-avatars', text: 'No avatars', state: null, tooltip: 'Hide avatars on tweets' },
  'debug-owo': { className: 'debug-owo', text: 'Debug', state: null, tooltip: 'Debug stuff' },
};

const newEl = (tag, classNames, attributes, text) => {
  const el = doc.createElement(tag);
  if (classNames) cAdd(el, classNames);
  if (attributes) Object.entries(attributes).forEach(([key, val]) => aSet(el, key, val));
  if (text) el.innerText = text;
  return el;
};

const doPause = () => (!toggles['owo-enabled'].state || lHref().includes('status'));

const simpleToggle = (className, val, isPaused = doPause()) => {
  cToggle(html, className, !!val && (!isPaused || className == 'owo-enabled'));
  toggles[className].state = !!val;
  if (val) store.setItem(className, val);
  else store.removeItem(className);
};

const newSimpleToggle = (nameClsId, text, tooltipText, isPaused = doPause()) => {
  toggles[nameClsId].state = store.getItem(nameClsId);
  const label = newEl('label', ['owo-switch'], { for: nameClsId });
  const tooltip = newEl('span', ['owo-switch-tooltip'], null, tooltipText);
  const input = newEl('input', null, { type: 'checkbox', id: nameClsId });
  const span = newEl('span', ['slider'], null, text);
  aCld(label, input);
  aCld(label, span);
  if (tooltipText) aCld(label, tooltip);
  if (toggles[nameClsId].state) input.checked = true;
  input.addEventListener('change', ev => simpleToggle(nameClsId, ev.target.checked));
  return label;
};

const autoPlayHandler = vid => {
  const rect = vid.getBoundingClientRect();
  const top = Math.round(rect.top - window.innerHeight / 2);
  const bottom = Math.round(rect.bottom - rect.height / 2);
  const isOutOfView = (bottom <= 0 || top >= 0);
  if (!isOutOfView && vid.paused) vid.play();
  else if (isOutOfView && !vid.paused) vid.pause();
};

const watchNewTweet = tweet => {
  const tKey = el.tLoc(tweet) || false;
  if (!tKey) return false;
  aSet(tweet, 'owo-watching', 'true');
  aSet(tweet, 'owo-key', tKey);
  const lKey = window.location.pathname;
  cToggle(tweet, ['owo-liked'], tweet.querySelector('[data-testid="unlike"]'));

  if (!tweetCache[lKey][tKey]) tweetCache[lKey][tKey] = {
    h: null,
    count: Object.keys(tweetCache[lKey]).length + 1,
    noMedia: null,
  };

  const tagArea = el.tUserName(tweet);
  if (tagArea) aCld(tagArea, newEl('div', ['num-tag'], null, tweetCache[lKey][tKey].count));

  if (!el.tMedia(tweet).length) {
    tweetCache[lKey][tKey].noMedia = true;
    cAdd(tweet, ['no-media']);
  } else {
    tweetCache[lKey][tKey].noMedia = false;
    const warnBtn = el.tWarnBtn(tweet);
    if (warnBtn) warnBtn.click();
    const vids = el.tVids(tweet);
    if (!vids.length) return tKey;
    tweetCache[lKey][tKey].vids = true;
    vids.forEach(vid => vid.addEventListener('pause', ev => autoPlayHandler(ev.target), { capture: true }));
  }

  return tKey;
};

const feedViewObserver = new IntersectionObserver(entries => {
  const lKey = window.location.pathname;
  entries.forEach(entry => {
    const tweet = entry.target;
    const tKey = aGet(tweet, 'owo-key') || watchNewTweet(tweet);
    const lCache = tweetCache[lKey];
    if (!tKey || !lCache) return;

    if (entry.intersectionRatio >= 0.5) {
      cAdd(tweet, ['in-view']);
      setTimeout(() => {
        const h = tweet.clientHeight;
        tweetCache[lKey][tKey].h = h;
        pSet(tweet, '--owo-h', h);
      }, 500);
    }

    if (entry.intersectionRatio > 0) {
      cToggle(tweet, ['owo-liked'], tweet.querySelector('[data-testid="unlike"]'));
      if (tweetCache[lKey][tKey].noMedia && el.tMedia(tweet).length) {
        tweetCache[lKey][tKey].noMedia = false;
        cRemove(tweet, ['no-media']);
      }

      if (aGet(tweet, 'above-view'))
        cToggle(tweet, 'above-view', tweet.getBoundingClientRect().top < 0);

      if (tweetCache[lKey][tKey].vids)
        el.tVids(tweet).forEach(vid => autoPlayHandler(vid));
    }


  });
}, iOptions);

const observeItems = items => {
  items.forEach(el => {
    feedViewObserver.observe(el);
    if (el.getBoundingClientRect().top >= 0) return;
    aSet(el, 'above-view', 'true');
    cAdd(el, ['above-view']);
  });
};


const feedItemsObserver = new MutationObserver(mutationList => {
  const tAdded = mutationList.filter(m => m.addedNodes.length).map(m => Object.values(m.addedNodes)).flat();
  observeItems(tAdded);
});

const isFeed = () => {
  const wlp = window.location.pathname;
  if (!toggles['owo-enabled'].state) return false;
  if (wlp.endsWith('/home')) return true;
  if (wlp.includes('/status/')) return false;
  const metaEl = document.querySelector('meta[property="og:type"]');
  if (metaEl && metaEl.content == 'profile') return true;
  //console.log('isFeed', metaEl);
  return false;
};

let cLoc = lHref();
const feedElObserver = new MutationObserver(mutationList => {
  console.log(lHref());
  const nLoc = lHref();
  if (cLoc == nLoc) return;
  feedItemsObserver.disconnect();
  feedViewObserver.disconnect();
  cLoc = nLoc;
  init();
});

let initialized = false;
let lastPauseState = null;

const feedWait = new MutationObserver(() => {
  const isPaused = doPause();
  cToggle(html, ['owo-feed'], isFeed());

  if (initialized && isPaused && lastPauseState == isPaused) return;

  if (!initialized) {
    const pageMain = document.querySelector('main[role="main"] div');
    if (!pageMain) return;
    feedElObserver.observe(pageMain, { childList: true, subtree: false });
    const toggleCnn = document.querySelector('[data-testid="SideNav_NewTweet_Button"]')?.parentElement;
    initialized = !!toggleCnn;
    if (toggleCnn) for (const key in toggles)
      toggleCnn.appendChild(newSimpleToggle(toggles[key].className, toggles[key].text, toggles[key].tooltip));
  } else if (initialized && lastPauseState != isPaused) {
    lastPauseState = isPaused;
    for (const key in toggles)
      simpleToggle(toggles[key].className, toggles[key].state, isPaused);
  }

  if (initialized && isPaused) return;

  const feed = document.querySelector('div[data-testid="primaryColumn"] div[aria-label*="Timeline"] > div:has(div[data-testid="cellInnerDiv"])');

  if (!feed) return;
  feedWait.disconnect();
  observeItems(feed.childNodes);
  feedItemsObserver.observe(feed, { childList: true, subtree: false });
  console.log('feedWait', feed);
});

let autoScrollRunning = false;

const scrollWatch = () => {
  let scrollTimeout = null;
  document.addEventListener('scroll', ev => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const currentEl = getCurrentEl();
      console.log(autoScrollRunning, currentEl);
      if (!autoScrollRunning) return;
      scrollToEl(getSiblingEl());
    }, 900);
  }, { passive: true });
};

const init = () => {
  scrollWatch();
  if (!tweetCache[window.location.pathname]) tweetCache[window.location.pathname] = {};
  cAdd(html, ['owo-enabled']);
  feedWait.observe(document.querySelector('body'), { subtree: true, childList: true });
};

const easing = t => t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

const scrollToElStep = (ts, elScroll) => {
  if (!elScroll.start) elScroll.start = ts;
  const time = ts - elScroll.start;
  const percent = easing(Math.min(time / (((elScroll.diff < 0 ? elScroll.diff * -1 : elScroll.diff) / window.innerHeight) * scrollSpeed), 1));
  window.scrollTo(0, elScroll.startY + elScroll.diff * percent);
  if (time < scrollSpeed) window.requestAnimationFrame(ts => scrollToElStep(ts, elScroll));
  else scrollToEl(elScroll.elem);
};

const scrollToEl = elem => {
  if (!elem || !document.hasFocus()) return;
  const elScroll = {
    elem: elem,
    diff: null,
    start: null,
    startY: window.pageYOffset,
  };

  const elemTop = elem.getBoundingClientRect().top;
  if (elemTop == 0) return;
  const vHeight = window.innerHeight;
  const sHeight = document.body.scrollHeight;
  const elemY = elScroll.startY + elemTop - 53;
  const targetY = sHeight - elemY < vHeight ? sHeight - vHeight : elemY;
  elScroll.diff = targetY - elScroll.startY;
  if (elScroll.diff > -10 && elScroll.diff < 10) return;
  // console.log(elem);
  window.requestAnimationFrame(ts => scrollToElStep(ts, elScroll));
};

const getXSibling = (el, next) => next ? el?.nextElementSibling : el?.previousElementSibling;
const getCurrentEl = () => document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 4).closest('[data-testid="cellInnerDiv"]');

const getSiblingEl = (next = true) => {
  let currentEl = getCurrentEl();
  let siblingEl = getXSibling(currentEl, next);

  if (next && (!currentEl || window.pageYOffset <= 20))
    siblingEl = document.querySelector('[data-testid="cellInnerDiv"]');
  else if (!next && (!currentEl || (document.body.scrollHeight - window.pageYOffset - window.innerHeight) < 20))
    siblingEl = document.querySelector('[data-testid="cellInnerDiv"]:last-child');
  else if (!next && (!currentEl || window.pageYOffset <= 800))
    return document.querySelector('body');
  else if (!currentEl)
    return null;

  const skipLiked = toggles['collapse-likes'].state ? el => el.classList.contains('owo-liked') : () => false;
  const skipNoMedia = toggles['media-only'].state ? el => el.classList.contains('no-media') : () => false;

  while (!aGet(siblingEl, 'owo-key') || skipNoMedia(siblingEl) || skipLiked(siblingEl)) {
    const sibsib = getXSibling(siblingEl, next);
    if (!sibsib) break;
    siblingEl = sibsib;
  }

  //console.log(siblingEl);
  return siblingEl;
};

document.addEventListener('keydown', e => {
  if (e.code == 'Space') e.preventDefault();
  else if (autoScrollRunning) autoScrollRunning = false;

  if (e.code == 'ArrowUp') scrollToEl(getSiblingEl(false));
  else if (e.code == 'ArrowDown') scrollToEl(getSiblingEl());
  else if (e.code == 'Space' && autoScrollRunning) autoScrollRunning = false;
  else if (e.code == 'Space' && toggles['auto-scroll'].state) {
    autoScrollRunning = true;
    scrollToEl(getSiblingEl());
  }
  else if (e.code == 'Enter') {
    getCurrentEl().querySelector('[data-testid="like"], [data-testid="unlike"]').click();
    setTimeout(() => {
      if (toggles['auto-scroll'].state) autoScrollRunning = true;
      scrollToEl(getSiblingEl());
    }, 400);
  }
  else if (e.code == 'ArrowRight') getCurrentEl().querySelector('video').currentTime += 2;
  else if (e.code == 'ArrowLeft') getCurrentEl().querySelector('video').currentTime -= 2;
});

document.addEventListener('DOMContentLoaded', () => init(), { once: true });


/* ------------------------------------------------------------------------------------------ */


const testPosts = [
  { postId: '1573135204771831809', postUrl: 'https://twitter.com/FuseAfterBark/status/1573135204771831809' },
  { postId: '1292556599496544256', postUrl: 'https://twitter.com/Sulo_AD/status/1292556599496544256' },
  { postId: '1384549308255674373', postUrl: 'https://twitter.com/MarwanCharmieAD/status/1384549308255674373' },
  { postId: '1471970618434326529', postUrl: 'https://twitter.com/hroarDark/status/1471970618434326529' },
  { postId: '1471970618477726529', postUrl: 'https://twitter.com/notExisting/status/1471970618477726529' },
];

let fPostsLength = null;
let fQueryId = 'lI07N6Otwv1PhnEgXILM7A';
let fUrl = `https://twitter.com/i/api/graphql/${fQueryId}/FavoriteTweet`;
let fHeaders = {
  "accept": "*/*",
  "accept-language": "en,en-US;q=0.9,de-DE;q=0.8,de;q=0.7",
  "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
  "cache-control": "no-cache",
  "content-type": "application/json",
  "pragma": "no-cache",
  "sec-ch-ua": "\"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"108\", \"Google Chrome\";v=\"108\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "x-csrf-token": "787af3041d74e9bcc394d25f46bdcec47d16b01113de6ef7eeda19d26c74a41c162906c4851b60c876c8bbfbf51d55f7abcecb5b793f804b6c96b9289ab7d81d51c5169852bc20f4019a34e933b7f304",
  "x-twitter-active-user": "yes",
  "x-twitter-auth-type": "OAuth2Session",
  "x-twitter-client-language": "en"
};

const sendLikes = (tweetIds) => {
  const post = tweetIds.shift();
  const fBody = `{"variables":{"tweet_id":"${post['postId']}"},"queryId":"${fQueryId}"}`;
  const currentProg = (fPostsLength - tweetIds.length);
  const listProg = `${Math.round((currentProg / fPostsLength) * 100)}% [${currentProg}/${fPostsLength}] | `;
  console.info(listProg + 'Liking: ' + post['postUrl']);
  fetch(fUrl, { "headers": fHeaders, "body": fBody, "method": "POST" }).then(res => res.text()).then(resData => {
    const respStr = listProg + resData.slice(0, 120) + '...';
    if (resData.includes('favorite_tweet":"Done"')) console.warn(respStr);
    else console.log(respStr);
    if (!resData.includes('already favorited tweet') && !resData.includes('favorite_tweet":"Done"'))
      console.error('Error while liking: ' + post['postUrl'], resData);
    else if (tweetIds.length > 0) setTimeout(() => sendLikes(tweetIds), 1000);
    else console.info('Finished liking all posts!');
  });
};

const startLiking = (tweetIds, queryId = fQueryId, headers = fHeaders) => {
  fPostsLength = tweetIds.length;
  fQueryId = queryId;
  fHeaders = headers;
  sendLikes(tweetIds);
};