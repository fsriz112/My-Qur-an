const API_BASE = 'https://equran.id/api/v2/surat';

const elements = {
  list: document.querySelector('#surah-list'),
  listEmpty: document.querySelector('#list-empty'),
  search: document.querySelector('#surah-search'),
  select: document.querySelector('#surah-select'),
  total: document.querySelector('#surah-total'),
  title: document.querySelector('#surah-title'),
  number: document.querySelector('#surah-number-label'),
  meaning: document.querySelector('#surah-meaning'),
  arabicName: document.querySelector('#surah-arabic-name'),
  origin: document.querySelector('#surah-origin'),
  verseCount: document.querySelector('#surah-verse-count'),
  verses: document.querySelector('#verses'),
  status: document.querySelector('#reader-status'),
  error: document.querySelector('#reader-error'),
  errorMessage: document.querySelector('#reader-error-message'),
  retry: document.querySelector('#retry-button'),
  previous: document.querySelector('#previous-surah'),
  next: document.querySelector('#next-surah'),
  pagination: document.querySelector('#pagination-label'),
  smaller: document.querySelector('#text-smaller'),
  larger: document.querySelector('#text-larger')
};

const state = { surahs: [], selectedNumber: 1, requestId: 0, translationSize: 12 };

function setStatus(message) {
  elements.status.textContent = message;
  elements.status.hidden = !message;
}

function setError(message) {
  elements.errorMessage.textContent = message;
  elements.error.hidden = false;
}

function createSurahOption(surah) {
  const button = document.createElement('button');
  button.className = 'surah-option';
  button.type = 'button';
  button.dataset.number = String(surah.nomor);
  button.setAttribute('aria-current', String(surah.nomor === state.selectedNumber));

  const index = document.createElement('span');
  index.className = 'surah-index';
  index.textContent = String(surah.nomor).padStart(3, '0');

  const info = document.createElement('span');
  info.className = 'surah-option-info';
  const name = document.createElement('span');
  name.className = 'surah-option-name';
  name.textContent = surah.namaLatin;
  const detail = document.createElement('span');
  detail.className = 'surah-option-detail';
  detail.textContent = `${surah.arti} · ${surah.jumlahAyat} ayat`;
  info.append(name, detail);

  const arabic = document.createElement('span');
  arabic.className = 'surah-option-arabic';
  arabic.lang = 'ar';
  arabic.dir = 'rtl';
  arabic.textContent = surah.nama;
  button.append(index, info, arabic);
  button.addEventListener('click', () => loadSurah(surah.nomor));
  return button;
}

function renderSurahOptions() {
  const query = elements.search.value.trim().toLocaleLowerCase('id');
  const filtered = state.surahs.filter((surah) => (
    `${surah.nomor} ${surah.namaLatin} ${surah.arti}`.toLocaleLowerCase('id').includes(query)
  ));
  const fragment = document.createDocumentFragment();
  filtered.forEach((surah) => fragment.append(createSurahOption(surah)));
  elements.list.replaceChildren(fragment);
  elements.listEmpty.hidden = filtered.length > 0;
}

function renderSurahSelect() {
  const fragment = document.createDocumentFragment();
  state.surahs.forEach((surah) => {
    const option = document.createElement('option');
    option.value = String(surah.nomor);
    option.textContent = `${String(surah.nomor).padStart(3, '0')} · ${surah.namaLatin}`;
    fragment.append(option);
  });
  elements.select.replaceChildren(fragment);
}

function updateSurahHeading(surah) {
  state.selectedNumber = surah.nomor;
  elements.title.textContent = surah.namaLatin;
  elements.number.textContent = `SURAH ${String(surah.nomor).padStart(3, '0')}`;
  elements.meaning.textContent = surah.arti;
  elements.arabicName.textContent = surah.nama;
  elements.origin.textContent = surah.tempatTurun;
  elements.verseCount.textContent = `${surah.jumlahAyat} ayat`;
  elements.select.value = String(surah.nomor);
  elements.previous.disabled = surah.nomor === 1;
  elements.next.disabled = surah.nomor === state.surahs.length;
  elements.pagination.textContent = `${surah.nomor} / ${state.surahs.length}`;
  renderSurahOptions();
}

function createVerse(verse) {
  const article = document.createElement('article');
  article.className = 'verse';

  const top = document.createElement('div');
  top.className = 'verse-top';
  const number = document.createElement('span');
  number.className = 'verse-number';
  number.textContent = String(verse.nomorAyat);
  top.append(number);

  const arabic = document.createElement('p');
  arabic.className = 'verse-arabic';
  arabic.lang = 'ar';
  arabic.dir = 'rtl';
  arabic.textContent = verse.teksArab;

  const latin = document.createElement('p');
  latin.className = 'verse-latin';
  latin.textContent = verse.teksLatin;

  const translation = document.createElement('p');
  translation.className = 'verse-translation';
  translation.textContent = verse.teksIndonesia;

  article.append(top, arabic, latin, translation);
  return article;
}

async function loadSurah(number) {
  const surah = state.surahs.find((item) => item.nomor === number);
  if (!surah) return;

  state.selectedNumber = number;
  const requestId = ++state.requestId;
  updateSurahHeading(surah);
  elements.verses.replaceChildren();
  elements.error.hidden = true;
  setStatus('Memuat ayat...');

  try {
    const response = await fetch(`${API_BASE}/${number}`);
    if (!response.ok) throw new Error(`Permintaan gagal (${response.status}).`);
    const result = await response.json();
    if (result.code !== 200 || !Array.isArray(result.data?.ayat)) {
      throw new Error('Format data surah tidak sesuai.');
    }
    if (requestId !== state.requestId) return;

    const fragment = document.createDocumentFragment();
    result.data.ayat.forEach((verse) => fragment.append(createVerse(verse)));
    elements.verses.replaceChildren(fragment);
    setStatus('');
  } catch (error) {
    if (requestId !== state.requestId) return;
    setStatus('');
    setError(error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil data.');
  }
}

async function initialize() {
  setStatus('Memuat daftar surah...');
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) throw new Error(`Permintaan gagal (${response.status}).`);
    const result = await response.json();
    if (result.code !== 200 || !Array.isArray(result.data) || result.data.length !== 114) {
      throw new Error('Daftar surah tidak lengkap.');
    }

    state.surahs = result.data;
    elements.total.textContent = String(state.surahs.length);
    renderSurahOptions();
    renderSurahSelect();
    await loadSurah(state.selectedNumber);
  } catch (error) {
    setStatus('');
    setError(error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil daftar surah.');
  }
}

elements.search.addEventListener('input', renderSurahOptions);
elements.select.addEventListener('change', () => loadSurah(Number(elements.select.value)));
elements.previous.addEventListener('click', () => loadSurah(state.selectedNumber - 1));
elements.next.addEventListener('click', () => loadSurah(state.selectedNumber + 1));
elements.retry.addEventListener('click', () => {
  elements.error.hidden = true;
  if (state.surahs.length === 0) initialize();
  else loadSurah(state.selectedNumber);
});
elements.smaller.addEventListener('click', () => {
  state.translationSize = Math.max(10, state.translationSize - 1);
  document.documentElement.style.setProperty('--translation-size', `${state.translationSize}px`);
});
elements.larger.addEventListener('click', () => {
  state.translationSize = Math.min(18, state.translationSize + 1);
  document.documentElement.style.setProperty('--translation-size', `${state.translationSize}px`);
});
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && document.activeElement !== elements.search && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    elements.search.focus();
  }
});

initialize();
