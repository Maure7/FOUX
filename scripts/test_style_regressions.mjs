import assert from 'node:assert/strict';

// Runs through the editor's real React controls in the Chromium test harness.
export async function runStyleRegressions({ evaluate, command, eventually }) {
  console.log('Background border-area support:', await evaluate(`CSS.supports('background-clip', 'border-area')`));
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos').click()`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Eventos').click()`);
  const toggle = async (label) => evaluate(`Array.from(document.querySelectorAll('.sidebar-toggle-row')).find(row => row.textContent.includes(${JSON.stringify(label)})).querySelector('input').click()`);
  const hoverCss = () => evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('foux-user-hover-rules')?.textContent || ''`);
  await toggle('Escala');
  await evaluate(`(() => {
    const input = document.querySelector('input[type="range"][min="0.8"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '1.1');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await eventually(async () => (await hoverCss()).includes('scale(1.1)'), 'Scale was not enabled');
  const point = await evaluate(`(() => {
    const frame = document.querySelector('.editor-canvas__iframe');
    const element = frame.contentDocument.getElementById('secao-titulos');
    element.scrollIntoView({block:'center'});
    const rect = element.getBoundingClientRect();
    const outer = frame.getBoundingClientRect();
    return { x: outer.left + rect.left + rect.width/2, y: outer.top + rect.top + rect.height/2 };
  })()`);
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await eventually(() => evaluate(`document.querySelector('.editor-canvas__iframe').contentWindow.getComputedStyle(document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos')).transform.includes('1.1')`), 'Real hover did not scale the section');
  await toggle('Escala');
  await eventually(async () => !(await hoverCss()).includes('transform'), 'Disabling scale retained a transform rule');
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await eventually(() => evaluate(`document.querySelector('.editor-canvas__iframe').contentWindow.getComputedStyle(document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos')).transform === 'none'`), 'Scale stayed active after disabling');

  // Reenable with the stored slider value and retain unrelated effects on removal.
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos').style.transform = 'translateX(3px)'`);
  await toggle('Escala');
  await toggle('Sombra');
  await eventually(async () => (await hoverCss()).includes('box-shadow'), 'Shadow was not enabled');
  // Zero values must survive selecting another element and returning.
  await evaluate(`(() => {
    const inputs = [...document.querySelectorAll('.shadow-offset-field input'),
      ...Array.from(document.querySelectorAll('.sidebar-control')).filter(control => /Desfoque|Opacidade/.test(control.textContent)).flatMap(control => [...control.querySelectorAll('input[type="number"]')])];
    for (const input of inputs) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '0');
      input.dispatchEvent(new Event('input', {bubbles:true}));
    }
  })()`);
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('title:main').click()`);
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.shadow-offset-field input')[1].value`), '0', 'Zero shadow Y changed after reselection');
  assert.equal(await evaluate(`document.querySelector('input[aria-label="Desfoque (Blur)"][type="number"]').value`), '0');
  assert.equal(await evaluate(`document.querySelector('input[aria-label="Opacidade da Sombra"][type="number"]').value`), '0');
  await toggle('Escala');
  await eventually(async () => !(await hoverCss()).includes('transform') && (await hoverCss()).includes('box-shadow'), 'Scale removal affected another hover property');
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await eventually(() => evaluate(`document.querySelector('.editor-canvas__iframe').contentWindow.getComputedStyle(document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos')).transform === 'matrix(1, 0, 0, 1, 3, 0)'`), 'Disabling scale did not restore the authored transform');
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos').style.removeProperty('transform')`);
  const ruleCount = await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('foux-user-hover-rules').sheet.cssRules.length`);
  assert.equal(ruleCount, 1, 'Repeated changes created duplicate selectors');
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('title:main').click()`);
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos').click()`);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.sidebar-toggle-row')).find(row => row.textContent.includes('Escala')).querySelector('input').checked`), false);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.sidebar-toggle-row')).find(row => row.textContent.includes('Sombra')).querySelector('input').checked`), true);
  await toggle('Sombra');
  console.log('PASS: real hover scale removal, unchanged slider, retained shadow, selector uniqueness and selection restoration');

  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('title:main').click()`);
  await evaluate(`(() => {
    const doc = document.querySelector('.editor-canvas__iframe').contentDocument;
    doc.querySelector('button').classList.add('foux-hover-target-other');
    doc.getElementById('foux-user-hover-rules').textContent = '/* FOUX User Hover Rules */ #secao-titulos:hover {transform:scale(1.2) !important;color:#112233 !important;} .foux-hover-target-other:hover {transform:scale(1.3) !important;}';
    doc.getElementById('secao-titulos').click();
  })()`);
  await eventually(() => evaluate(`Array.from(document.querySelectorAll('.sidebar-toggle-row')).find(row => row.textContent.includes('Escala')).querySelector('input').checked`), 'Legacy ID scale was not restored');
  await toggle('Escala');
  await eventually(() => evaluate(`(() => {
    const doc = document.querySelector('.editor-canvas__iframe').contentDocument;
    const rules = Array.from(doc.getElementById('foux-user-hover-rules').sheet.cssRules);
    const cls = Array.from(doc.getElementById('secao-titulos').classList).find(name => name.startsWith('foux-hover-target-'));
    const target = rules.find(rule => rule.selectorText === '.' + cls + ':hover');
    const other = rules.find(rule => rule.selectorText === '.foux-hover-target-other:hover');
    return !rules.some(rule => rule.selectorText === '#secao-titulos:hover') && target && !target.style.transform && target.style.color === 'rgb(17, 34, 51)' && other.style.transform === 'scale(1.3)';
  })()`), 'Legacy scale removal affected another selector or retained the ID rule');
  await toggle('Texto');
  await evaluate(`(() => {
    const doc = document.querySelector('.editor-canvas__iframe').contentDocument;
    doc.querySelector('button').classList.remove('foux-hover-target-other');
    doc.getElementById('foux-user-hover-rules').textContent = '';
  })()`);
  console.log('PASS: authored transform, legacy ID migration and independent rules on another element');

  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Estilos').click()`);
  const borderToggle = () => evaluate(`Array.from(document.querySelectorAll('.sidebar-section')).find(section => section.querySelector('.sidebar-section__title').textContent.includes('BORDAS')).querySelector('.sidebar-gradient-toggle input').click()`);
  await borderToggle();
  await eventually(() => evaluate(`!!document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos').getAttribute('data-foux-gradient-border')`), 'Border gradient control did not reach the inspector');
  await evaluate(`(() => {
    const section = Array.from(document.querySelectorAll('.sidebar-section')).find(section => section.querySelector('.sidebar-section__title').textContent.includes('BORDAS'));
    const input = section.querySelector('input[type="number"][max="50"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '36');
    input.dispatchEvent(new Event('input', {bubbles:true}));
    input.dispatchEvent(new Event('change', {bubbles:true}));
  })()`);
  await eventually(() => evaluate(`document.querySelector('.editor-canvas__iframe').contentWindow.getComputedStyle(document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos')).borderRadius === '36px'`), 'Radius did not update with an active gradient');
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('title:main').click()`);
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos').click()`);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.sidebar-section')).find(section => section.querySelector('.sidebar-section__title').textContent.includes('BORDAS')).querySelector('.sidebar-gradient-toggle input').checked`), true);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Eventos').click()`);
  await toggle('Fundo');
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('title:main').click()`);
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos').click()`);
  assert.equal(await evaluate(`document.querySelector('.sidebar-gradient-toggle input').checked`), false, 'Solid hover color was mistaken for the border gradient');
  await evaluate(`document.querySelector('.sidebar-gradient-toggle input').click()`);
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('title:main').click()`);
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos').click()`);
  assert.equal(await evaluate(`document.querySelector('.sidebar-gradient-toggle input').checked`), true);
  assert.equal(await evaluate(`document.querySelector('.sidebar-gradient-colors input[type="color"]').value`), '#e59843');
  await toggle('Fundo');
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Estilos').click()`);
  await borderToggle();
  assert.equal(await evaluate(`document.querySelector('.editor-canvas__iframe').contentWindow.getComputedStyle(document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos')).borderColor`), 'rgb(51, 51, 51)');
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('title:main').click()`);
  await evaluate(`(() => {
    const element = document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos');
    element.style.borderImage = 'linear-gradient(45deg, #00ffff, #ff00ff) 1';
    element.click();
  })()`);
  await eventually(() => evaluate(`Array.from(document.querySelectorAll('.sidebar-section')).find(section => section.querySelector('.sidebar-section__title').textContent.includes('BORDAS')).querySelector('.sidebar-gradient-toggle input').checked`), 'Legacy border-image was not migrated');
  await borderToggle();
  assert.equal(await evaluate(`document.querySelector('.editor-canvas__iframe').contentWindow.getComputedStyle(document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos')).borderImageSource`), 'none');
  console.log('PASS: border/radius controls, restored hover backgrounds, selection restoration and legacy border-image migration');
  // Border/background helper is exercised in a separate same-origin document,
  // including save/reopen and export to the original unmodified HTML.
  const result = await evaluate(`(async () => {
    const {setGradientBorder, updateGradientBorderBackground, getGradientBorder} = await import('/src/utils/gradientBorder.js');
    const {generateProjectCss} = await import('/src/utils/exportCss.js');
    const frame = document.createElement('iframe'); frame.id = 'border-regression-test';
    Object.assign(frame.style, {position:'fixed',left:'0',top:'0',width:'400px',height:'300px',zIndex:'20000',border:'0'});
    const original = '<!doctype html><html><head><style>body{margin:0;background:#00ff00}#box{box-sizing:border-box;width:240px;height:140px;border:8px solid #333;border-radius:32px;background:#fff}</style></head><body><section id="box"></section></body></html>';
    await new Promise(resolve => {frame.onload = resolve; frame.srcdoc = original; document.body.append(frame);});
    let element = frame.contentDocument.getElementById('box');
    element.setAttribute('data-foux-original-style', '');
    setGradientBorder(element, {color1:'#ff0000',color2:'#0000ff',angle:90});
    const css = await generateProjectCss(frame.contentDocument);
    const persisted = frame.contentDocument.documentElement.outerHTML;
    await new Promise(resolve => {frame.onload = resolve; frame.srcdoc = persisted;});
    element = frame.contentDocument.getElementById('box');
    const restored = getGradientBorder(element);
    updateGradientBorderBackground(element, 'backgroundImage', 'linear-gradient(45deg, #ffffff, #ffff00)');
    updateGradientBorderBackground(element, 'backgroundColor', '#abcdef');
    const layered = element.style.backgroundImage;
    setGradientBorder(element, null);
    const disabled = {image:element.style.backgroundImage, color:element.style.backgroundColor,borderImage:frame.contentWindow.getComputedStyle(element).borderImageSource,borderColor:frame.contentWindow.getComputedStyle(element).borderColor};
    // The screenshot will now check the actual CSS export on the untouched HTML.
    await new Promise(resolve => {frame.onload = resolve; frame.srcdoc = original + '<style>' + css + '</style>';});
    const cs = frame.contentWindow.getComputedStyle(frame.contentDocument.getElementById('box'));
    return {css, restored, layered, disabled, radius:cs.borderRadius, borderImage:cs.borderImageSource};
  })()`);
  assert.equal(result.restored.angle, 90);
  assert.equal(result.radius, '32px');
  assert.equal(result.borderImage, 'none');
  assert.match(result.css, /padding-box.*border-(box|area)/);
  assert.match(result.layered, /45deg.*90deg/);
  assert.match(result.disabled.image, /45deg/);
  assert.equal(result.disabled.color, 'rgb(171, 205, 239)');
  assert.equal(result.disabled.borderImage, 'none');
  assert.equal(result.disabled.borderColor, 'rgb(51, 51, 51)');
  await command('Input.dispatchMouseEvent', {type:'mouseMoved',x:390,y:290});
  const screenshot = await command('Page.captureScreenshot', {format:'png',clip:{x:0,y:0,width:240,height:140,scale:1}});
  const pixels = await evaluate(`(async () => {
    const image = new Image(); image.src = 'data:image/png;base64,' + ${JSON.stringify(screenshot.data)};
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width=240;canvas.height=140;
    const context = canvas.getContext('2d'); context.drawImage(image,0,0);
    return [[1,1],[120,70],[120,2]].map(([x,y]) => Array.from(context.getImageData(x,y,1,1).data));
  })()`);
  assert.deepEqual(pixels[0], [0,255,0,255], 'Rounded corner exposed a square gradient border');
  assert.deepEqual(pixels[1], [255,255,255,255], 'Border gradient leaked into the content');
  assert.ok(pixels[2][0] > 100 && pixels[2][2] > 100 && pixels[2][1] < 10, 'Gradient border did not render');
  if (result.restored.borderArea) {
    await evaluate(`(async () => {
      const {setGradientBorder} = await import('/src/utils/gradientBorder.js');
      const {generateProjectCss} = await import('/src/utils/exportCss.js');
      const frame = document.getElementById('border-regression-test');
      const original = '<!doctype html><style>body{margin:0;background:#00ff00}#box{box-sizing:border-box;width:240px;height:140px;border:8px solid #333;border-radius:32px;background:rgba(255,255,255,.5)}</style><section id="box"></section>';
      await new Promise(resolve => {frame.onload=resolve;frame.srcdoc=original;});
      setGradientBorder(frame.contentDocument.getElementById('box'), {color1:'#ff0000',color2:'#0000ff',angle:90});
      const css = await generateProjectCss(frame.contentDocument);
      await new Promise(resolve => {frame.onload=resolve;frame.srcdoc=original+'<style>'+css+'</style>';});
    })()`);
    const alphaScreenshot = await command('Page.captureScreenshot', {format:'png',clip:{x:0,y:0,width:240,height:140,scale:1}});
    const center = await evaluate(`(async () => {
      const image = new Image(); image.src = 'data:image/png;base64,' + ${JSON.stringify(alphaScreenshot.data)};
      await image.decode();
      const canvas=document.createElement('canvas');canvas.width=240;canvas.height=140;
      const context=canvas.getContext('2d');context.drawImage(image,0,0);
      return Array.from(context.getImageData(120,70,1,1).data);
    })()`);
    assert.ok(center[0] >= 127 && center[0] <= 128 && center[1] === 255 && center[2] >= 127 && center[2] <= 128, 'Border gradient leaked through translucent content');
  }
  await evaluate(`document.getElementById('border-regression-test').remove()`);
  // Use the actual keyboard editing path, including clearing the numeric input.
  await evaluate(`(() => {
    const element = document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos');
    element.style.setProperty('border', '0px none red', 'important');
    element.click();
    const input = document.querySelector('input[aria-label="Espessura da Borda"][type="number"]');
    if (!input) throw new Error('Missing border width input');
    input.focus(); input.select();
  })()`);
  await command('Input.dispatchKeyEvent', {type:'keyDown', key:'Backspace', code:'Backspace', windowsVirtualKeyCode:8});
  await command('Input.dispatchKeyEvent', {type:'keyUp', key:'Backspace', code:'Backspace', windowsVirtualKeyCode:8});
  assert.equal(await evaluate(`document.activeElement.value`), '', 'Clearing a number restored the previous value');
  await command('Input.insertText', {text:'5'});
  await evaluate(`document.activeElement.blur()`);
  assert.deepEqual(await evaluate(`(() => {
    const frame = document.querySelector('.editor-canvas__iframe');
    const cs = frame.contentWindow.getComputedStyle(frame.contentDocument.getElementById('secao-titulos'));
    return [cs.borderTopWidth, cs.borderTopStyle];
  })()`), ['5px', 'solid']);
  await evaluate(`(() => {
    const frame = document.querySelector('.editor-canvas__iframe');
    const element = frame.contentDocument.getElementById('secao-titulos');
    element.style.setProperty('border-style', 'dashed', 'important'); element.click();
    const input = document.querySelector('input[aria-label="Espessura da Borda"][type="number"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '7');
    input.dispatchEvent(new Event('input', {bubbles:true}));
  })()`);
  assert.equal(await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('secao-titulos').style.borderStyle`), 'dashed');
  console.log('PASS: direct numeric typing, zero shadow persistence, important border edits and preserved dashed style');
  await evaluate(`document.querySelector('.editor-canvas__iframe').contentDocument.getElementById('title:main').click()`);
  console.log('PASS: rounded gradient pixels, composed backgrounds, persisted gradient, restored solid border and exported CSS');
}
