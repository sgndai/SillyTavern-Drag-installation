<<<<<<< HEAD
type Scope = 'global' | 'character' | 'preset';
type ActivationPolicy = 'ask' | 'enable' | 'disable';
type CssPolicy = 'ask' | 'append' | 'replace';

type ScriptButton = { name: string; visible: boolean };
type HelperScript = {
  type: 'script';
  enabled: boolean;
  name: string;
  id: string;
  content: string;
  info: string;
  button: { enabled: boolean; buttons: ScriptButton[] };
  data: Record<string, unknown>;
  export_with: { data: boolean; button: boolean };
};
type ScriptFolder = {
  type: 'folder';
  enabled: boolean;
  name: string;
  id: string;
  icon: string;
  color: string;
  scripts: HelperScript[];
};
type ScriptTree = HelperScript | ScriptFolder;

type TavernRegex = {
  id: string;
  script_name: string;
  enabled: boolean;
  find_regex: string;
  trim_strings: string[];
  replace_string: string;
  source: { user_input: boolean; ai_output: boolean; slash_command: boolean; world_info: boolean; reasoning: boolean };
  destination: { display: boolean; prompt: boolean };
  run_on_edit: boolean;
  min_depth: number | null;
  max_depth: number | null;
};

type Settings = {
  activationPolicy: ActivationPolicy;
  cssPolicy: CssPolicy;
  highlight: boolean;
};

type ZoneId = 'worldbook' | 'preset' | 'background' | 'theme' | 'css' | 'helper-script' | 'regex' | 'extension';
type Zone = { id: ZoneId; label: string; element: Element; scope?: Scope };

const hostWindow = window.parent && window.parent !== window ? window.parent : window;
const hostDocument = hostWindow.document;
const localAny = window as unknown as Record<string, any>;
const hostAny = hostWindow as unknown as Record<string, any>;
const toastr = hostAny.toastr ?? localAny.toastr;

const STYLE_ID = 'st-drag-install-style';
const OVERLAY_ID = 'st-drag-install-overlay';
const SETTINGS_ID = 'st-drag-install-settings';
const STORAGE_KEY = 'drag_installation';

const DEFAULT_SETTINGS: Settings = {
  activationPolicy: 'ask',
  cssPolicy: 'ask',
  highlight: true,
};

function helperFn<T extends Function>(name: string): T | undefined {
  return (localAny[name] ?? localAny.TavernHelper?.[name] ?? hostAny.TavernHelper?.[name]) as T | undefined;
}

function notify(kind: 'success' | 'info' | 'warning' | 'error', message: string, title?: string) {
  if (toastr?.[kind]) toastr[kind](message, title);
  else {
    const text = title ? `${title}: ${message}` : message;
    if (kind === 'error') console.error(text);
    else if (kind === 'warning') console.warn(text);
    else console.info(text);
  }
}

function uuid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stem(name: string) {
  return name.replace(/\.[^.]+$/, '');
}

function getSettings(): Settings {
  try {
    const getVariables = helperFn<(option: { type: 'script' }) => Record<string, any>>('getVariables');
    const saved = getVariables?.({ type: 'script' })?.[STORAGE_KEY];
    return { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  } catch {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(hostWindow.localStorage.getItem(STORAGE_KEY) ?? '{}') };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
}

function saveSettings(settings: Settings) {
  try {
    const updateVariablesWith = helperFn<(
      updater: (variables: Record<string, any>) => Record<string, any>,
      option: { type: 'script' },
    ) => Record<string, any>>('updateVariablesWith');
    if (updateVariablesWith) {
      updateVariablesWith(vars => ({ ...vars, [STORAGE_KEY]: settings }), { type: 'script' });
      return;
    }
  } catch (error) {
    console.warn('[Drag installation] failed to save script settings', error);
  }
  hostWindow.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function ensureStyle() {
  if (hostDocument.getElementById(STYLE_ID)) return;
  const style = hostDocument.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${OVERLAY_ID}{position:fixed;z-index:2147483646;pointer-events:none;border:2px solid var(--SmartThemeQuoteColor,#8ab4f8);background:color-mix(in srgb,var(--SmartThemeQuoteColor,#8ab4f8) 12%,transparent);border-radius:8px;display:none;box-sizing:border-box}
#${OVERLAY_ID} .stdi-label{position:absolute;top:8px;left:8px;padding:5px 8px;border-radius:6px;background:rgba(0,0,0,.78);color:#fff;font:600 13px/1.3 sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.35)}
#${SETTINGS_ID}{margin:8px 0;padding:10px;border:1px solid var(--SmartThemeBorderColor,#666);border-radius:8px}
#${SETTINGS_ID} .stdi-title{font-weight:700;margin-bottom:8px}
#${SETTINGS_ID} .stdi-row{display:grid;grid-template-columns:minmax(110px,1fr) minmax(150px,1.4fr);gap:8px;align-items:center;margin:6px 0}
#${SETTINGS_ID} select,#${SETTINGS_ID} button{width:100%}
#${SETTINGS_ID} .stdi-warning{margin-top:6px;color:#e6a23c;font-size:12px;display:none}
#${SETTINGS_ID} .stdi-actions{display:flex;gap:6px;margin-top:8px}
`;
  hostDocument.head.appendChild(style);
}

function overlay(): HTMLDivElement {
  let el = hostDocument.getElementById(OVERLAY_ID) as HTMLDivElement | null;
  if (!el) {
    el = hostDocument.createElement('div');
    el.id = OVERLAY_ID;
    el.innerHTML = '<div class="stdi-label"></div>';
    hostDocument.body.appendChild(el);
  }
  return el;
}

function showOverlay(zone: Zone) {
  if (!getSettings().highlight) return;
  const rect = zone.element.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const el = overlay();
  Object.assign(el.style, {
    display: 'block',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  const label = el.querySelector('.stdi-label');
  if (label) label.textContent = `导入到：${zone.label}`;
}

function hideOverlay() {
  const el = hostDocument.getElementById(OVERLAY_ID);
  if (el) el.style.display = 'none';
}

function closestAny(target: Element, selectors: string): Element | null {
  try {
    return target.closest(selectors);
  } catch {
    return null;
  }
}

function resolveZone(target: Element | null): Zone | null {
  if (!target) return null;
  if (closestAny(target, '#send_form, #form_sheld, #send_textarea, .mes_textarea, [data-drop-target="chat"]')) return null;

  const helperContainer = closestAny(target, '[data-container-type="global"],[data-container-type="character"],[data-container-type="preset"]') as HTMLElement | null;
  if (helperContainer) {
    const scope = helperContainer.dataset.containerType as Scope;
    return { id: 'helper-script', label: `${scope === 'global' ? '全局' : scope === 'character' ? '角色' : '预设'}脚本`, element: helperContainer, scope };
  }

  const regexScoped = closestAny(target, '#scoped_scripts_block, [data-regex-scope="character"], [data-regex-scope="scoped"]');
  if (regexScoped) return { id: 'regex', label: '角色正则', element: regexScoped, scope: 'character' };
  const regexPreset = closestAny(target, '#preset_scripts_block, [data-regex-scope="preset"]');
  if (regexPreset) return { id: 'regex', label: '预设正则', element: regexPreset, scope: 'preset' };
  const regexGlobal = closestAny(target, '#global_scripts_block, [data-regex-scope="global"]');
  if (regexGlobal) return { id: 'regex', label: '全局正则', element: regexGlobal, scope: 'global' };

  const css = closestAny(target, '#customCSS, #CustomCSS-textAreaBlock, #CustomCSS-block');
  if (css) return { id: 'css', label: '自定义 CSS', element: closestAny(target, '#CustomCSS-block') ?? css };

  const world = closestAny(target, '#world_popup, #world_editor_select, #world_import_button, #world_popup_entries_list');
  if (world) return { id: 'worldbook', label: '世界书', element: closestAny(target, '#world_popup') ?? world };

  const background = closestAny(target, '#bg_menu_content, #bg_custom_content, #bg_folder_grid, #bg_global_tab, #bg_chat_tab, #add_background_button_top');
  if (background) {
    const panel = closestAny(target, '#bg_global_tab, #bg_chat_tab') ?? background;
    return { id: 'background', label: '背景', element: panel };
  }

  const theme = closestAny(target, '#themes, #ui-preset-import-button, #ui-preset-export-button, #ui-preset-delete-button, #ui-preset-update-button, #ui-preset-new-button');
  if (theme) return { id: 'theme', label: 'UI 主题', element: theme.parentElement ?? theme };

  const preset = closestAny(target, '[data-preset-manager-for], [data-preset-manager-import], [data-preset-manager-export], [data-preset-manager-update], [data-preset-manager-new], #openai_api-presets, #textgenerationwebui_api-presets, #kobold_api-presets, #novel_api-presets, #settings_preset_openai');
  if (preset) return { id: 'preset', label: '预设', element: preset };

  const extensions = closestAny(target, '#extensions_details, #extensionsMenu, #extensions_settings, #extensions_settings2');
  if (extensions) return { id: 'extension', label: '扩展', element: extensions };

  return null;
}

function isFileDrag(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

function accepted(zone: Zone, file: File): boolean {
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
  switch (zone.id) {
    case 'worldbook': return ['.json', '.lorebook', '.png'].includes(ext);
    case 'preset': return ['.json', '.settings', '.preset'].includes(ext);
    case 'background': return file.type.startsWith('image/') || file.type.startsWith('video/');
    case 'theme': return ext === '.json';
    case 'css': return ['.css', '.txt'].includes(ext) || file.type === 'text/css';
    case 'helper-script': return ext === '.json';
    case 'regex': return ext === '.json';
    case 'extension': return false;
  }
}

function filesFromDrop(event: DragEvent, zone: Zone): File[] {
  return Array.from(event.dataTransfer?.files ?? []).filter(file => accepted(zone, file));
}

function setInputFiles(input: HTMLInputElement, files: File[]) {
  const dt = new hostAny.DataTransfer();
  files.forEach(file => dt.items.add(file));
  input.files = dt.files;
}

async function dispatchNativeInput(selector: string, files: File[], multiple: boolean) {
  const input = hostDocument.querySelector(selector) as HTMLInputElement | null;
  if (!input) throw new Error(`未找到原生导入控件：${selector}`);
  if (multiple) {
    setInputFiles(input, files);
    input.dispatchEvent(new hostAny.Event('change', { bubbles: true }));
    return;
  }
  for (const file of files) {
    setInputFiles(input, [file]);
    input.dispatchEvent(new hostAny.Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 80));
  }
}

async function choose(title: string, options: Array<{ value: string; label: string; danger?: boolean }>): Promise<string | null> {
  return new Promise(resolve => {
    const mask = hostDocument.createElement('div');
    mask.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.45);display:grid;place-items:center;padding:20px';
    const box = hostDocument.createElement('div');
    box.style.cssText = 'min-width:280px;max-width:520px;background:var(--SmartThemeBlurTintColor,#252525);color:var(--SmartThemeBodyColor,#eee);border:1px solid var(--SmartThemeBorderColor,#666);border-radius:10px;padding:14px;box-shadow:0 12px 40px rgba(0,0,0,.4)';
    const heading = hostDocument.createElement('div');
    heading.textContent = title;
    heading.style.cssText = 'font-weight:700;margin-bottom:12px';
    const buttons = hostDocument.createElement('div');
    buttons.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end';
    for (const option of options) {
      const button = hostDocument.createElement('button');
      button.className = 'menu_button';
      button.textContent = option.label;
      if (option.danger) button.style.borderColor = '#c55';
      button.onclick = () => { mask.remove(); resolve(option.value); };
      buttons.appendChild(button);
    }
    const cancel = hostDocument.createElement('button');
    cancel.className = 'menu_button';
    cancel.textContent = '取消';
    cancel.onclick = () => { mask.remove(); resolve(null); };
    buttons.appendChild(cancel);
    box.append(heading, buttons);
    mask.appendChild(box);
    mask.addEventListener('click', event => {
      if (event.target === mask) { mask.remove(); resolve(null); }
    });
    hostDocument.body.appendChild(mask);
  });
}

async function resolveActivationPolicy(): Promise<boolean | null> {
  const policy = getSettings().activationPolicy;
  if (policy === 'enable') return true;
  if (policy === 'disable') return false;
  const result = await choose('导入后状态', [
    { value: 'enable', label: '启用' },
    { value: 'disable', label: '保持关闭' },
  ]);
  return result === null ? null : result === 'enable';
}

function normalizeScript(raw: any, enabled: boolean, fallbackName = '未命名脚本'): HelperScript {
  const source = raw?.type === 'script' && raw?.value ? raw.value : raw;
  const buttons = source?.button?.buttons ?? source?.buttons ?? [];
  return {
    type: 'script',
    enabled,
    name: String(source?.name ?? fallbackName),
    id: uuid(),
    content: String(source?.content ?? ''),
    info: String(source?.info ?? ''),
    button: {
      enabled: Boolean(source?.button?.enabled ?? true),
      buttons: Array.isArray(buttons) ? buttons.map((item: any) => ({ name: String(item?.name ?? ''), visible: Boolean(item?.visible ?? true) })) : [],
    },
    data: source?.data && typeof source.data === 'object' ? source.data : {},
    export_with: {
      data: Boolean(source?.export_with?.data ?? true),
      button: Boolean(source?.export_with?.button ?? true),
    },
  };
}

function normalizeScriptTree(raw: any, enabled: boolean, fallbackName: string): ScriptTree[] {
  if (Array.isArray(raw)) return raw.flatMap((item, index) => normalizeScriptTree(item, enabled, `${fallbackName}-${index + 1}`));
  if (!raw || typeof raw !== 'object') throw new Error('脚本 JSON 结构无效');
  const isOldFolder = raw.type === 'folder' && Array.isArray(raw.value);
  const isNewFolder = raw.type === 'folder' && Array.isArray(raw.scripts);
  if (isOldFolder || isNewFolder) {
    const scriptsRaw = isNewFolder ? raw.scripts : raw.value;
    const folder: ScriptFolder = {
      type: 'folder', enabled, name: String(raw.name ?? fallbackName), id: uuid(),
      icon: String(raw.icon ?? 'fa-solid fa-folder'),
      color: String(raw.color ?? ''),
      scripts: scriptsRaw.map((item: any, index: number) => normalizeScript(item, enabled, `${fallbackName}-${index + 1}`)),
    };
    return [folder];
  }
  return [normalizeScript(raw, enabled, fallbackName)];
}

async function importHelperScripts(scope: Scope, files: File[]) {
  const enabled = await resolveActivationPolicy();
  if (enabled === null) return;
  const trees: ScriptTree[] = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      trees.push(...normalizeScriptTree(JSON.parse(await file.text()), enabled, stem(file.name)));
    } catch (error) {
      errors.push(`${file.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const updateScriptTreesWith = helperFn<(
    updater: (scripts: ScriptTree[]) => ScriptTree[],
    option: { type: Scope },
  ) => ScriptTree[]>('updateScriptTreesWith');
  if (!updateScriptTreesWith) throw new Error('当前酒馆助手未提供脚本树写入接口');
  updateScriptTreesWith(list => [...list, ...trees], { type: scope });
  if (trees.length) notify('success', `已导入 ${trees.length} 个脚本/文件夹到${scope === 'global' ? '全局' : scope === 'character' ? '角色' : '预设'}脚本`);
  if (errors.length) notify('error', errors.join('\n'), '部分脚本导入失败');
}

function flattenRegexPayload(raw: any): any[] {
  if (Array.isArray(raw)) return raw.flatMap(flattenRegexPayload);
  if (!raw || typeof raw !== 'object') return [];
  if ('findRegex' in raw || 'find_regex' in raw) return [raw];
  for (const key of ['regexes', 'scripts', 'items', 'children']) {
    if (Array.isArray(raw[key])) return raw[key].flatMap(flattenRegexPayload);
  }
  return [];
}

function normalizeHelperRegex(raw: any, enabled: boolean, fallbackName: string): TavernRegex {
  return {
    id: String(raw.id ?? uuid()),
    script_name: String(raw.script_name ?? fallbackName),
    enabled,
    find_regex: String(raw.find_regex ?? ''),
    trim_strings: Array.isArray(raw.trim_strings) ? raw.trim_strings.map(String) : [],
    replace_string: String(raw.replace_string ?? ''),
    source: {
      user_input: Boolean(raw.source?.user_input), ai_output: Boolean(raw.source?.ai_output),
      slash_command: Boolean(raw.source?.slash_command), world_info: Boolean(raw.source?.world_info), reasoning: Boolean(raw.source?.reasoning),
    },
    destination: { display: Boolean(raw.destination?.display), prompt: Boolean(raw.destination?.prompt) },
    run_on_edit: Boolean(raw.run_on_edit),
    min_depth: typeof raw.min_depth === 'number' ? raw.min_depth : null,
    max_depth: typeof raw.max_depth === 'number' ? raw.max_depth : null,
  };
}

async function importRegexFiles(scope: Scope, files: File[]) {
  const enabled = await resolveActivationPolicy();
  if (enabled === null) return;
  const getTavernRegexes = helperFn<(option: { type: Scope }) => TavernRegex[]>('getTavernRegexes');
  const replaceTavernRegexes = helperFn<(regexes: TavernRegex[], option: { type: Scope }) => Promise<void>>('replaceTavernRegexes');
  const importRawTavernRegex = helperFn<(name: string, content: string) => boolean>('importRawTavernRegex');
  if (!getTavernRegexes || !replaceTavernRegexes || !importRawTavernRegex) throw new Error('当前酒馆助手未提供正则导入接口');

  const beforeGlobal = getTavernRegexes({ type: 'global' });
  const imported: TavernRegex[] = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      const payloads = flattenRegexPayload(JSON.parse(await file.text()));
      if (!payloads.length) throw new Error('未找到正则条目');
      for (const [index, raw] of payloads.entries()) {
        const name = String(raw.scriptName ?? raw.script_name ?? (payloads.length === 1 ? stem(file.name) : `${stem(file.name)}-${index + 1}`));
        if ('find_regex' in raw) {
          imported.push(normalizeHelperRegex(raw, enabled, name));
          continue;
        }
        const oldLength = getTavernRegexes({ type: 'global' }).length;
        const ok = importRawTavernRegex(name, JSON.stringify(raw));
        const now = getTavernRegexes({ type: 'global' });
        if (!ok || now.length <= oldLength) throw new Error(`正则 '${name}' 解析失败`);
        const item = now[now.length - 1];
        item.enabled = enabled;
        imported.push(item);
      }
    } catch (error) {
      errors.push(`${file.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await replaceTavernRegexes(beforeGlobal, { type: 'global' });
  if (imported.length) {
    const target = getTavernRegexes({ type: scope });
    await replaceTavernRegexes([...target, ...imported], { type: scope });
    notify('success', `已导入 ${imported.length} 条正则到${scope === 'global' ? '全局' : scope === 'character' ? '角色' : '预设'}正则`);
  }
  if (errors.length) notify('error', errors.join('\n'), '部分正则导入失败');
}

async function importCss(files: File[]) {
  const textarea = hostDocument.querySelector('#customCSS') as HTMLTextAreaElement | null;
  if (!textarea) throw new Error('未找到自定义 CSS 编辑器');
  const incoming = (await Promise.all(files.map(file => file.text()))).join('\n\n');
  const current = textarea.value;
  let policy = getSettings().cssPolicy;
  if (current.trim() && policy === 'ask') {
    const result = await choose('自定义 CSS 已有内容', [
      { value: 'append', label: '追加' },
      { value: 'replace', label: '替换', danger: true },
    ]);
    if (result === null) return;
    policy = result as CssPolicy;
  }
  textarea.value = !current.trim() || policy === 'replace' ? incoming : `${current.trimEnd()}\n\n${incoming}`;
  textarea.dispatchEvent(new hostAny.Event('input', { bubbles: true }));
  notify('success', policy === 'append' && current.trim() ? 'CSS 已追加' : 'CSS 已导入');
}

function findPresetInput(zone: Zone): HTMLInputElement | null {
  const select = zone.element.matches('[data-preset-manager-for]')
    ? zone.element as HTMLElement
    : zone.element.querySelector?.('[data-preset-manager-for]') as HTMLElement | null;
  const apiIds = select?.dataset.presetManagerFor?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
  for (const apiId of apiIds) {
    const input = hostDocument.querySelector(`input[data-preset-manager-file="${CSS.escape(apiId)}"]`) as HTMLInputElement | null;
    if (input) return input;
  }
  if (zone.element.closest?.('#openai_api-presets') || zone.element.querySelector?.('#settings_preset_openai')) {
    return hostDocument.querySelector('#openai_preset_import_file') as HTMLInputElement | null;
  }
  return null;
}

async function importPreset(zone: Zone, files: File[]) {
  const input = findPresetInput(zone);
  if (input) {
    for (const file of files) {
      setInputFiles(input, [file]);
      input.dispatchEvent(new hostAny.Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    return;
  }
  const importRawPreset = helperFn<(name: string, content: string) => Promise<boolean>>('importRawPreset');
  if (!importRawPreset) throw new Error('未找到当前预设的原生导入控件');
  for (const file of files) {
    const ok = await importRawPreset(stem(file.name), await file.text());
    if (!ok) throw new Error(`预设 '${file.name}' 导入失败`);
  }
  notify('success', `已导入 ${files.length} 个预设`);
}

function droppedUrl(event: DragEvent): string | null {
  const dt = event.dataTransfer;
  const raw = dt?.getData('text/uri-list') || dt?.getData('text/plain') || '';
  const url = raw.split(/\r?\n/).map(s => s.trim()).find(s => /^https:\/\/github\.com\/[^/]+\/[^/#?]+(?:[/?#].*)?$/i.test(s));
  if (!url) return null;
  const match = url.match(/^(https:\/\/github\.com\/[^/]+\/[^/#?]+)/i);
  return match?.[1] ?? null;
}

async function importExtension(url: string) {
  const installExtension = helperFn<(url: string, type: 'local' | 'global') => Promise<Response>>('installExtension');
  if (!installExtension) throw new Error('当前酒馆助手未提供扩展安装接口');
  const scope = await choose('扩展安装范围', [
    { value: 'local', label: '仅当前用户' },
    { value: 'global', label: '全局' },
  ]);
  if (scope === null) return;
  const response = await installExtension(url, scope as 'local' | 'global');
  if (!response.ok) throw new Error(`扩展安装失败：HTTP ${response.status}`);
  notify('success', '扩展已安装；刷新页面后生效');
}

async function handleDrop(zone: Zone, event: DragEvent) {
  if (zone.id === 'extension') {
    const url = droppedUrl(event);
    if (url) return importExtension(url);
    return;
  }
  const files = filesFromDrop(event, zone);
  if (!files.length) return;
  switch (zone.id) {
    case 'worldbook': return dispatchNativeInput('#world_import_file', files, false);
    case 'preset': return importPreset(zone, files);
    case 'background': return dispatchNativeInput('#add_bg_button', files, true);
    case 'theme': return dispatchNativeInput('#ui_preset_import_file', files, false);
    case 'css': return importCss(files);
    case 'helper-script': return importHelperScripts(zone.scope ?? 'global', files);
    case 'regex': return importRegexFiles(zone.scope ?? 'global', files);
  }
}

function canHandle(zone: Zone, event: DragEvent): boolean {
  if (zone.id === 'extension') return Boolean(droppedUrl(event));
  return filesFromDrop(event, zone).length > 0;
}

let activeZone: Zone | null = null;
function eventTarget(event: DragEvent): Element | null {
  const direct = event.target instanceof Element ? event.target : null;
  if (direct) return direct;
  return hostDocument.elementFromPoint(event.clientX, event.clientY);
}

function onDragOver(event: DragEvent) {
  if (!isFileDrag(event) && !(event.dataTransfer?.types ?? []).includes('text/uri-list') && !(event.dataTransfer?.types ?? []).includes('text/plain')) {
    hideOverlay();
    activeZone = null;
    return;
  }
  const zone = resolveZone(eventTarget(event));
  activeZone = zone;
  if (!zone) { hideOverlay(); return; }
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  showOverlay(zone);
}

async function onDrop(event: DragEvent) {
  const zone = resolveZone(eventTarget(event)) ?? activeZone;
  activeZone = null;
  hideOverlay();
  if (!zone || !canHandle(zone, event)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  try {
    await handleDrop(zone, event);
  } catch (error) {
    console.error('[Drag installation] import failed', error);
    notify('error', error instanceof Error ? error.message : String(error), '拖放导入失败');
  }
}

function onDragLeave(event: DragEvent) {
  if (event.relatedTarget === null) {
    activeZone = null;
    hideOverlay();
  }
}

function zoneReport() {
  const selectors: Record<string, string> = {
    worldbook: '#world_popup,#world_import_file', preset: '[data-preset-manager-for],#settings_preset_openai',
    background: '#bg_menu_content,#bg_chat_tab,#add_bg_button', theme: '#themes,#ui_preset_import_file',
    css: '#CustomCSS-block,#customCSS', helperScripts: '[data-container-type]',
    regex: '#global_scripts_block,#preset_scripts_block,#scoped_scripts_block', extensions: '#extensions_settings2,#extensions_details',
  };
  const result: Record<string, any> = {
    url: hostWindow.location.href,
    tavernHelper: Boolean(hostAny.TavernHelper ?? localAny.TavernHelper),
    anchors: {},
  };
  for (const [name, selector] of Object.entries(selectors)) {
    result.anchors[name] = Array.from(hostDocument.querySelectorAll(selector)).map((el: Element) => ({
      tag: el.tagName, id: el.id, class: el.className, data: Object.fromEntries(Object.entries((el as HTMLElement).dataset ?? {})),
    }));
  }
  return result;
}

function mountSettings() {
  if (hostDocument.getElementById(SETTINGS_ID)) return;
  const container = hostDocument.querySelector('#extensions_settings2, #extensions_settings');
  if (!container) return;
  const settings = getSettings();
  const root = hostDocument.createElement('div');
  root.id = SETTINGS_ID;
  root.className = 'extension_container';
  root.innerHTML = `
    <div class="stdi-title">拖放安装</div>
    <label class="stdi-row"><span>脚本/正则导入后</span><select data-key="activationPolicy"><option value="ask">每次询问</option><option value="enable">始终启用</option><option value="disable">始终关闭</option></select></label>
    <div class="stdi-warning">“始终启用”会让拖入的脚本立即运行。</div>
    <label class="stdi-row"><span>CSS 已有内容</span><select data-key="cssPolicy"><option value="ask">每次询问</option><option value="append">始终追加</option><option value="replace">始终替换</option></select></label>
    <label class="stdi-row"><span>区域高亮</span><select data-key="highlight"><option value="true">开启</option><option value="false">关闭</option></select></label>
    <div class="stdi-actions"><button class="menu_button" data-action="diagnose">复制区域诊断</button></div>`;
  container.prepend(root);
  const activation = root.querySelector('[data-key="activationPolicy"]') as HTMLSelectElement;
  const cssPolicy = root.querySelector('[data-key="cssPolicy"]') as HTMLSelectElement;
  const highlight = root.querySelector('[data-key="highlight"]') as HTMLSelectElement;
  const warning = root.querySelector('.stdi-warning') as HTMLElement;
  activation.value = settings.activationPolicy;
  cssPolicy.value = settings.cssPolicy;
  highlight.value = String(settings.highlight);
  const syncWarning = () => warning.style.display = activation.value === 'enable' ? 'block' : 'none';
  syncWarning();
  root.addEventListener('change', () => {
    const next: Settings = { activationPolicy: activation.value as ActivationPolicy, cssPolicy: cssPolicy.value as CssPolicy, highlight: highlight.value === 'true' };
    saveSettings(next);
    syncWarning();
  });
  root.querySelector('[data-action="diagnose"]')?.addEventListener('click', async () => {
    const report = JSON.stringify(zoneReport(), null, 2);
    try {
      await hostWindow.navigator.clipboard.writeText(report);
      notify('success', '区域诊断已复制到剪贴板');
    } catch {
      console.info('[Drag installation] zone report', report);
      notify('info', '区域诊断已输出到浏览器控制台');
    }
  });
}

function init() {
  ensureStyle();
  mountSettings();
  const observer = new hostAny.MutationObserver(() => mountSettings());
  observer.observe(hostDocument.body, { childList: true, subtree: true });
  hostDocument.addEventListener('dragover', onDragOver, true);
  hostDocument.addEventListener('dragleave', onDragLeave, true);
  hostDocument.addEventListener('drop', onDrop, true);
  window.addEventListener('pagehide', () => {
    observer.disconnect();
    hostDocument.removeEventListener('dragover', onDragOver, true);
    hostDocument.removeEventListener('dragleave', onDragLeave, true);
    hostDocument.removeEventListener('drop', onDrop, true);
    hostDocument.getElementById(OVERLAY_ID)?.remove();
    hostDocument.getElementById(SETTINGS_ID)?.remove();
    hostDocument.getElementById(STYLE_ID)?.remove();
  }, { once: true });
  notify('info', '区域拖放导入已启用');
}

init();
=======
import '@/global.css';
import { initPanel } from '@/panel';

$(() => {
  initPanel();
});
>>>>>>> 1ca256efb083b39bc0e190b951d84e7eeb602823
