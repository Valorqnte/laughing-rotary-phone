# newproject

这个前端是 Vue 3 + Vite。

## 开发

```sh
npm install
npm run dev
```

- 开发环境通过 Vite proxy 把 `/api` 转发到 `http://localhost:3000`

## 生产构建

```sh
npm run build
```

构建产物在 `dist/`。

## 生产部署建议（DigitalOcean / Nginx）

- Nginx 直接托管 `dist/`
- 前端请求后端统一使用同源 `/api`（代码里已配置）
- Nginx 将 `/api/*` 反向代理到后端 `http://127.0.0.1:3000/*`（注意去掉 `/api` 前缀）

这样生产环境不会跨域，也不需要前端写死服务器地址。

---

Below is the original Vite template README (kept for reference).

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/items?itemName=Vue.volar) (and disable Vetur).
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).
