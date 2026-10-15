import assert from 'node:assert/strict';

export async function runI18n({ evaluate, command, eventually }) {
  // Both templates must have exactly the same elements, classes and CSS.
  const parity = await evaluate(String.raw`(async () => {
    const {getTutorialHtml, localizeTutorialHtml} = await import('/src/utils/tutorialI18n.js');
    const parser = new DOMParser();
    const pt = parser.parseFromString(getTutorialHtml('pt'), 'text/html');
    const es = parser.parseFromString(getTutorialHtml('es'), 'text/html');
    const migrated = parser.parseFromString(localizeTutorialHtml(getTutorialHtml('pt'), 'es'), 'text/html');
    const shape = doc => [...doc.querySelectorAll('*')].map(el => [el.tagName, el.className]);
    const styles = doc => [...doc.querySelectorAll('style')].map(el => el.textContent.split('/*').map((part,index) => index ? part.slice(part.indexOf('*/') + 2) : part).join('').replace(/\s+/g,' ').trim());
    return {pt:shape(pt), es:shape(es), css:styles(es), migratedCss:styles(migrated),
      translated:es.body.textContent.replace(/\s+/g,' ').trim(), migrated:migrated.body.textContent.replace(/\s+/g,' ').trim(),
      ids:[...es.querySelectorAll('[id]')].map(el => el.id)};
  })()`);
  assert.deepEqual(parity.pt, parity.es);
  assert.deepEqual(parity.css, parity.migratedCss);
  assert.equal(parity.translated, parity.migrated);
  assert.ok(parity.ids.includes('seccion-titulos') && parity.ids.includes('boton-primario'));
  assert.equal(new Set(parity.ids).size, parity.ids.length);

  await evaluate(`(async () => {
    const {TUTORIAL_HTML} = await import('/src/utils/tutorialTemplate.js');
    const doc = new DOMParser().parseFromString(TUTORIAL_HTML.replace(/src="https:[^"]*"/g, 'src="data:,"'), 'text/html');
    const title = doc.getElementById('titulo-exercicio');
    title.style.color = '#123456';
    title.setAttribute('fx-id', 'titulo-exercicio');
    doc.getElementById('btn-primario').setAttribute('data-foux-id', 'btn-primario');
    doc.getElementById('foux-user-hover-rules').textContent = '#btn-primario:hover {color:#112233 !important;}';
    localStorage.clear();
    localStorage.setItem('foux_language', 'es');
    localStorage.setItem('foux_tutorial_completed', 'true');
    localStorage.setItem('foux_projects', JSON.stringify([
      {id:'legacy',name:'TUTORIAL',folderId:null,htmlContent:'<!DOCTYPE html>'+doc.documentElement.outerHTML,showTutorialTips:false},
      {id:'custom',name:'Mi sitio',folderId:null,htmlContent:'<h1 id="custom">Meu conteúdo</h1>'}
    ]));
  })()`);
  await command('Page.reload');
  await eventually(() => evaluate(`document.documentElement.lang === 'es-419' && !!document.querySelector('.project-card--saved')`), 'Spanish dashboard did not load');
  const checkManual = async language => {
    await evaluate(`document.querySelector('[aria-label="${language === 'es' ? 'Ayuda' : 'Ajuda'}"]').click()`);
    await eventually(() => evaluate(`!!document.querySelector('.faq-manual__button')`), 'Help did not open');
    const href = await evaluate(`document.querySelector('.faq-manual__button').href`);
    assert.ok(href.endsWith(`/docs/manual_${language}.pdf`), href);
    assert.equal(await evaluate(`(async () => {const r=await fetch(document.querySelector('.faq-manual__button').href); return r.ok && (await r.text()).startsWith('%PDF-');})()`), true);
    await evaluate(`document.querySelector('.faq-modal .modal-close').click()`);
  };
  await checkManual('es');
  await evaluate(`Array.from(document.querySelectorAll('.project-card--saved')).find(card => card.textContent.includes('TUTORIAL')).click()`);
  const waitTitle = async (language) => eventually(() => evaluate(`!!document.querySelector('iframe')?.contentDocument?.getElementById('${language === 'es' ? 'titulo-ejercicio' : 'titulo-exercicio'}')`), `Tutorial did not switch to ${language}`);
  await waitTitle('es');
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.getElementById('titulo-ejercicio').style.color`), 'rgb(18, 52, 86)');
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.getElementById('titulo-ejercicio').getAttribute('fx-id')`), 'titulo-ejercicio');
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.getElementById('boton-primario').getAttribute('data-foux-id')`), 'boton-primario');
  await checkManual('es');

  await evaluate(`document.querySelector('.editor-header__tutorial-btn').click()`);
  await eventually(() => evaluate(`!!document.querySelector('.tutorial-tour[open]')`), 'Spanish tour did not start');
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.querySelector('[data-foux-selected]').id`), 'titulo-ejercicio');
  for (let index = 0; index < 8; index++) {
    await eventually(() => evaluate(`document.querySelector('.tutorial-tour__progress').textContent.startsWith('${index + 1} ')`), 'Spanish tour step missing');
    await evaluate(`document.querySelector('.tutorial-tour__next').click()`);
  }
  await eventually(() => evaluate(`!document.querySelector('.tutorial-tour')`), 'Spanish tour did not finish');

  // Use the real Spanish inspector, hover controls and CSS exporter.
  await evaluate(`document.querySelector('iframe').contentDocument.getElementById('boton-primario').click()`);
  await evaluate(`Array.from(document.querySelectorAll('.sidebar-tab')).find(button => button.textContent.trim() === 'Eventos').click()`);
  await evaluate(`Array.from(document.querySelectorAll('.sidebar-toggle-row')).find(row => row.textContent.toLowerCase().includes('escala')).querySelector('input').click()`);
  await eventually(() => evaluate(`document.querySelector('iframe').contentDocument.getElementById('foux-user-hover-rules').textContent.includes('scale(')`), 'Spanish hover control failed');
  const css = await evaluate(`(async () => {const {generateProjectCss}=await import('/src/utils/exportCss.js');return generateProjectCss(document.querySelector('iframe').contentDocument);})()`);
  assert.match(css, /#boton-primario:hover/);
  assert.match(css, /transform: scale\(/);
  assert.doesNotMatch(css, /#btn-primario|#secao-|#box-unica/);

  const switchLanguage = async language => {
    await evaluate(`document.querySelector('[aria-label="${language === 'pt' ? 'Configuraciones' : 'Configurações'}"]').click()`);
    await eventually(() => evaluate(`!!document.getElementById('language-select')`), 'Settings did not open');
    await evaluate(`(() => {const el=document.getElementById('language-select');el.value='${language}';el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await eventually(() => evaluate(`document.documentElement.lang === '${language === 'es' ? 'es-419' : 'pt-BR'}'`), 'App language did not update');
    await evaluate(`document.querySelector('.settings-page__back').click()`);
    await waitTitle(language);
  };
  await switchLanguage('pt');
  await checkManual('pt');
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.getElementById('titulo-exercicio').style.color`), 'rgb(18, 52, 86)');
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.getElementById('titulo-exercicio').getAttribute('fx-id')`), 'titulo-exercicio');
  await switchLanguage('es');
  await checkManual('es');
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.getElementById('titulo-ejercicio').style.color`), 'rgb(18, 52, 86)');
  assert.ok(await evaluate(`document.querySelector('iframe').contentDocument.getElementById('foux-user-hover-rules').textContent.includes('scale(')`));
  await evaluate(`document.querySelector('.editor-header__back').click()`);
  await eventually(() => evaluate(`!!document.getElementById('card-new-project')`), 'Dashboard did not reopen');
  await evaluate(`document.getElementById('card-new-project').click()`);
  await evaluate(`document.querySelector('.modal-action-btn--secondary').click()`);
  await waitTitle('es');
  assert.ok(await evaluate(`document.querySelector('iframe').contentDocument.body.textContent.includes('Bienvenido al Tutorial FOUX')`));
  await evaluate(`document.querySelector('.editor-header__back').click()`);
  await eventually(() => evaluate(`!!document.querySelector('.project-card--saved')`), 'Dashboard did not reload');
  await evaluate(`Array.from(document.querySelectorAll('.project-card--saved')).find(card => card.textContent.includes('Mi sitio')).click()`);
  await eventually(() => evaluate(`!!document.querySelector('iframe')?.contentDocument?.getElementById('custom')`), 'Custom project did not open');
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.getElementById('custom').textContent`), 'Meu conteúdo');
  console.log('PASS: identical PT/ES structure and CSS, localized PDFs, legacy tutorial migration, Spanish tour, inspection, hover/export, language roundtrip preserving edits, Spanish creation and untouched custom projects');
}
