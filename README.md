# 复现札记

这是一个纯静态的论文复现进度网站，不需要数据库或构建工具。`index.html`、`styles.css`、`app.js` 放在同一个目录即可运行。

点击概览页中的任意项目卡片会进入该项目的独立日志页。日志页支持富文本标题、列表、引用、代码块和链接；草稿、实验日志、项目进度与备注都会保存在当前浏览器中。

项目名称可以在概览页双击修改，也可以通过项目卡片或日志页右上角的三点设置菜单重命名。重命名以项目 ID 为关联依据，不会影响已有日志。

## 本地查看

直接打开 `index.html`。新增记录会保存在当前浏览器的本地存储中。

## 发布成可分享网址

### GitHub Pages（推荐）

针对当前仓库 `https://github.com/OrangesNeo/Replication-work`：

1. 将这个文件夹里的全部文件上传到仓库根目录（包括 `.github/workflows/pages.yml`）。
2. 提交到 `main` 分支。
3. 在仓库的 **Settings → Pages** 中将 Source 设为 **GitHub Actions**。
4. 等待 Actions 完成，网址通常是 `https://orangesneo.github.io/Replication-work/`。

发布后，把 `sitemap.xml` 里的 `https://YOUR-DOMAIN.example/` 替换成实际网址，并把 `robots.txt` 里的 Sitemap 注释取消。之后可以在 Google Search Console 和 Bing Webmaster Tools 提交 sitemap，加快收录。

### Netlify（最快）

登录 Netlify 后选择 **Add new site → Deploy manually**，把 `replica-notes` 文件夹拖入上传区域。Netlify 会立即分配一个 `*.netlify.app` 网址，也可以在 Domain settings 里绑定自己的域名。

### 自定义域名

购买域名后，在 GitHub Pages、Netlify 或 Cloudflare Pages 的域名设置中绑定它，再按平台提示添加 DNS 记录。绑定完成后，把 sitemap 里的地址同步改成新域名。

## 社交媒体与搜索

页面已经包含中文 description、Open Graph 标题/摘要、Twitter summary 卡片、manifest 和 robots 文件。部署后建议补一张 1200×630 的分享封面，并在 `index.html` 中添加 `og:image`；这样分享到微信、微博、X 或 LinkedIn 时会显示更完整的预览卡片。
