const searchPages = [
  {
    url: 'index.html',
    title: 'Главная',
    fallbackText: 'Леон Скотт Кеннеди персонаж Resident Evil полицейский Раккун-Сити агент D.S.O. Цитаты Bingo Resident Evil 2 Resident Evil 4'
  },
  {
    url: 'biography.html',
    title: 'Биография',
    fallbackText: 'Хронология жизни Леона 1998 Раккун-Сити Клэр Редфилд Ада Вонг Шерри Биркин Амбрелла 2004 Испания Эшли Грэм Лас-Плагас Осмунд Сэддлер 2005 2013 D.S.O. биотерроризм'
  },
  {
    url: 'costumes.html',
    title: 'Костюмы',
    fallbackText: 'Костюмы и одежда форма Р.П.Д. полицейская форма куртка с овчиной тактическая футболка полевая куртка Resident Evil 6 в тонкую полоску детектив-нуар'
  },
  {
    url: 'arsenal.html',
    title: 'Арсенал',
    fallbackText: 'Оружие снаряжение пистолеты SG-09 R Red9 дробовик W-870 винтовка SR M1903 Combat Knife Fighting Knife RPG-7 Chemical Flamethrower ножи'
  },
  {
    url: 'relationships.html',
    title: 'Отношения',
    fallbackText: 'Леон и другие герои Ада Вонг Эшли Грэм Клэр Редфилд Ингрид Ханниган Луис Сера союзники напарники Resident Evil'
  },
  {
    url: 'about.html',
    title: 'О проекте',
    fallbackText: 'Фан-энциклопедия Леон Кеннеди Resident Evil технологии HTML CSS Git GitHub автор Балаченкова Надежда'
  }
];

const form = document.querySelector('.site-search');
const input = form.querySelector('.site-search__input');
const toggleButton = form.querySelector('.site-search__button');
const results = form.querySelector('.site-search__results');
let indexedPages;
let loadingPages;
let currentResults = [];
let activeSearch = 0;

const normalize = (text) => text.toLocaleLowerCase('ru').replaceAll('ё', 'е');
const createSearchUrl = (page, query) => `${page}#${new URLSearchParams({ search: query })}`;

const loadPages = () => {
  if (indexedPages) return Promise.resolve(indexedPages);
  if (location.protocol === 'file:') {
    indexedPages = searchPages.map((page) => ({ ...page, content: page.fallbackText }));
    return Promise.resolve(indexedPages);
  }

  if (!loadingPages) {
    loadingPages = Promise.all(searchPages.map(async (page) => {
      const response = await fetch(page.url);
      if (!response.ok) {
        throw new Error(`Не удалось загрузить страницу ${page.url}: ${response.status}`);
      }

      const documentPage = new DOMParser().parseFromString(await response.text(), 'text/html');
      const main = documentPage.querySelector('main');
      if (!main) {
        throw new Error(`В странице ${page.url} не найден основной текст`);
      }

      const content = [...main.querySelectorAll('h1, h2, h3, h4, p, li, summary, figcaption')]
        .map((element) => element.textContent.trim())
        .filter(Boolean)
        .join(' ');

      return { ...page, content };
    })).then((pages) => {
      indexedPages = pages;
      return pages;
    }).catch((error) => {
      loadingPages = undefined;
      throw error;
    });
  }

  return loadingPages;
};

const getExcerpt = (content, query) => {
  const normalizedContent = normalize(content);
  const firstTerm = normalize(query.split(/\s+/).find((term) => normalizedContent.includes(normalize(term))) || query);
  const matchPosition = normalizedContent.indexOf(firstTerm);
  const start = Math.max(0, matchPosition - 55);
  const end = Math.min(content.length, start + 150);
  const excerpt = content.slice(start, end).replace(/\s+/g, ' ').trim();
  return `${start > 0 ? '…' : ''}${excerpt}${end < content.length ? '…' : ''}`;
};

const renderMessage = (message) => {
  results.replaceChildren();
  const item = document.createElement('span');
  item.className = 'site-search__message';
  item.textContent = message;
  results.append(item);
  results.hidden = false;
};

const renderResults = (pages, query) => {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  currentResults = pages
    .map((page) => {
      const searchableContent = normalize(page.content);
      const matchedTerms = terms.filter((term) => searchableContent.includes(term));
      if (matchedTerms.length !== terms.length) return null;

      return {
        ...page,
        score: (searchableContent.includes(normalize(query)) ? 2 : 0) + matchedTerms.length,
        excerpt: getExcerpt(page.content, query)
      };
    })
    .filter(Boolean)
    .sort((first, second) => second.score - first.score)
    .slice(0, 6);

  results.replaceChildren();
  if (currentResults.length === 0) {
    renderMessage('Ничего не найдено. Попробуйте изменить запрос.');
    return;
  }

  currentResults.forEach((result) => {
    const link = document.createElement('a');
    link.className = 'site-search__result';
    link.href = createSearchUrl(result.url, query);

    const title = document.createElement('span');
    title.className = 'site-search__result-title';
    title.textContent = result.title;

    const excerpt = document.createElement('span');
    excerpt.className = 'site-search__result-excerpt';
    excerpt.textContent = result.excerpt;

    link.append(title, excerpt);
    results.append(link);
  });
  results.hidden = false;
};

const setSearchOpen = (isOpen) => {
  form.classList.toggle('is-open', isOpen);
  toggleButton.setAttribute('aria-expanded', String(isOpen));
  toggleButton.setAttribute('aria-label', isOpen ? 'Закрыть поиск' : 'Открыть поиск');
  if (isOpen) {
    input.focus();
  } else {
    input.value = '';
    currentResults = [];
    results.hidden = true;
  }
};

toggleButton.addEventListener('click', () => {
  setSearchOpen(!form.classList.contains('is-open'));
});

input.addEventListener('input', async () => {
  const request = ++activeSearch;
  const query = input.value.trim();
  currentResults = [];
  if (!query) {
    results.hidden = true;
    return;
  }
  if (query.length < 2) {
    renderMessage('Введите не менее двух символов.');
    return;
  }

  renderMessage('Ищем по вики…');
  try {
    const pages = await loadPages();
    if (request !== activeSearch) return;
    renderResults(pages, query);
  } catch (error) {
    if (request !== activeSearch) return;
    console.error('Ошибка поиска по вики:', error);
    renderMessage('Не удалось загрузить страницы для поиска. Проверьте подключение и повторите попытку.');
  }
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (currentResults.length > 0) {
    window.location.href = createSearchUrl(currentResults[0].url, input.value.trim());
  }
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setSearchOpen(false);
    toggleButton.focus();
  }
});

document.addEventListener('click', (event) => {
  if (!form.contains(event.target) && form.classList.contains('is-open')) {
    setSearchOpen(false);
  }
});

const clearSearchHighlights = () => {
  document.querySelectorAll('mark.search-highlight').forEach((highlight) => {
    const parent = highlight.parentElement;
    highlight.replaceWith(document.createTextNode(highlight.textContent));
    parent.normalize();
  });
};

document.addEventListener('click', clearSearchHighlights);

const highlightSearchTerms = (query) => {
  clearSearchHighlights();
  if (!query) return;

  const terms = [...new Set(normalize(query).split(/\s+/).filter(Boolean))]
    .sort((first, second) => second.length - first.length);
  if (terms.length === 0) return;

  const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = terms
    .map((term) => [...term].map((character) => (
      character === 'е' ? '[её]' : escapeRegExp(character)
    )).join(''))
    .join('|');
  const matcher = new RegExp(`(^|[^\\p{L}\\p{N}_])(${pattern})(?=$|[^\\p{L}\\p{N}_])`, 'giu');
  const main = document.querySelector('main');
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement.closest('script, style, noscript, textarea, input, button, .site-search, [aria-hidden="true"], mark')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    }
  });
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  const firstMatch = textNodes.find((node) => matcher.test(node.textContent));
  matcher.lastIndex = 0;
  if (!firstMatch) return;

  const relationshipSlide = firstMatch.parentElement.closest('.relationship-slide');
  if (relationshipSlide?.hidden) {
    const carousel = relationshipSlide.closest('.relationship-carousel');
    const nextButton = carousel.querySelector('.relationship-carousel__button[data-direction="1"]');
    const slides = [...carousel.querySelectorAll('.relationship-slide')];
    for (let attempt = 0; attempt < slides.length && relationshipSlide.hidden; attempt += 1) {
      nextButton.click();
    }
  }

  const expandableCards = [];
  for (let element = firstMatch.parentElement; element; element = element.parentElement) {
    if (element instanceof HTMLDetailsElement && !element.open) {
      expandableCards.push(element);
    }
  }
  expandableCards.forEach((card) => { card.open = true; });

  let firstHighlight;
  textNodes.forEach((node) => {
    matcher.lastIndex = 0;
    const text = node.textContent;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = matcher.exec(text)) !== null) {
      const matchStart = match.index + match[1].length;
      const matchEnd = matchStart + match[2].length;
      fragment.append(document.createTextNode(text.slice(lastIndex, matchStart)));
      const highlight = document.createElement('mark');
      highlight.className = 'search-highlight';
      highlight.textContent = match[2];
      fragment.append(highlight);
      firstHighlight ||= highlight;
      lastIndex = matchEnd;
    }

    if (lastIndex > 0) {
      fragment.append(document.createTextNode(text.slice(lastIndex)));
      node.replaceWith(fragment);
    }
  });

  firstHighlight?.scrollIntoView({ behavior: 'instant', block: 'center' });
};

const highlightQueryFromHash = () => {
  const query = new URLSearchParams(location.hash.slice(1)).get('search') || '';
  requestAnimationFrame(() => highlightSearchTerms(query));
};

window.addEventListener('hashchange', highlightQueryFromHash);
highlightQueryFromHash();
