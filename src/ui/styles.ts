export const styles = `
:host {
  all: initial;
  color-scheme: light;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    "PingFang SC",
    "Microsoft YaHei",
    sans-serif;
}

* {
  box-sizing: border-box;
}

.dbph-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background: rgba(15, 23, 42, 0.22);
}

.dbph-panel {
  position: fixed;
  top: 72px;
  right: 24px;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  width: min(420px, calc(100vw - 32px));
  max-height: min(720px, calc(100vh - 112px));
  overflow: hidden;
  color: #172033;
  background: #ffffff;
  border: 1px solid #d8dee8;
  border-radius: 8px;
  box-shadow:
    0 24px 64px rgba(15, 23, 42, 0.22),
    0 4px 16px rgba(15, 23, 42, 0.12);
}

.dbph-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid #e6eaf0;
}

.dbph-panel-title {
  margin: 0;
  color: #121826;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.4;
  letter-spacing: 0;
}

.dbph-close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  padding: 0;
  color: #566274;
  background: transparent;
  border: 0;
  border-radius: 6px;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.dbph-close-button:hover {
  color: #121826;
  background: #eef2f7;
}

.dbph-close-button:focus-visible,
.dbph-search-input:focus-visible,
.dbph-template:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.dbph-search {
  padding: 12px 16px;
  border-bottom: 1px solid #e6eaf0;
}

.dbph-search-input {
  display: block;
  width: 100%;
  height: 38px;
  padding: 0 12px;
  color: #172033;
  background: #f8fafc;
  border: 1px solid #cfd7e3;
  border-radius: 6px;
  font: inherit;
  font-size: 14px;
  letter-spacing: 0;
}

.dbph-search-input::placeholder {
  color: #8a95a5;
}

.dbph-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid #e6eaf0;
}

.dbph-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 30px;
  padding: 0 10px;
  color: #344054;
  background: #ffffff;
  border: 1px solid #cfd7e3;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
}

.dbph-action-button:hover {
  color: #121826;
  background: #f3f6fa;
  border-color: #b8c4d4;
}

.dbph-action-button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.dbph-import-label {
  position: relative;
}

.dbph-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.dbph-remote {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid #e6eaf0;
}

.dbph-remote-label {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: #475467;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.dbph-remote-input {
  display: block;
  width: 100%;
  height: 32px;
  min-width: 0;
  padding: 0 10px;
  color: #172033;
  background: #f8fafc;
  border: 1px solid #cfd7e3;
  border-radius: 6px;
  font: inherit;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
}

.dbph-remote-input::placeholder {
  color: #98a2b3;
}

.dbph-remote-input:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.dbph-sync-button {
  height: 32px;
}

.dbph-status {
  min-height: 0;
  margin: 0;
  padding: 0 16px;
  color: #147a4a;
  font-size: 12px;
  line-height: 0;
}

.dbph-status:not(:empty) {
  padding-top: 8px;
  line-height: 1.4;
}

.dbph-status-error {
  color: #b42318;
}

.dbph-template-list {
  flex: 1 1 auto;
  min-height: 160px;
  overflow: auto;
  padding: 8px 8px 12px;
}

.dbph-category {
  margin: 0;
  padding: 8px 0 4px;
}

.dbph-category-title {
  margin: 0 0 6px;
  padding: 0 8px;
  color: #667085;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
  letter-spacing: 0;
}

.dbph-category-list {
  display: grid;
  gap: 4px;
}

.dbph-template {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 10px 12px;
  color: #172033;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
}

.dbph-template:hover {
  background: #f3f6fa;
  border-color: #dce3ee;
}

.dbph-template-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.dbph-template-name {
  overflow: hidden;
  color: #121826;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dbph-template-description {
  display: -webkit-box;
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.dbph-template-shortcut {
  flex: 0 0 auto;
  max-width: 96px;
  overflow: hidden;
  padding: 3px 7px;
  color: #175cd3;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dbph-empty {
  margin: 48px 12px;
  color: #667085;
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
}

@media (max-width: 520px) {
  .dbph-panel {
    top: 12px;
    right: 12px;
    left: 12px;
    width: auto;
    max-height: calc(100vh - 24px);
  }

  .dbph-actions,
  .dbph-remote {
    grid-template-columns: 1fr;
  }

  .dbph-actions {
    display: grid;
  }
}
`;
