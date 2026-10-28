## v2.5.9

<details>
<summary><strong> 🐞 修复问题 </strong></summary>

- 修复部分 IP 类型因名称映射不完整而一直显示「属性未知」的问题
- 修复自定义 IP 检测服务可使用非 HTTPS 地址发送 API Key 的问题
- 修复 DNS/WebRTC 检测依据不足时误判泄漏状态的问题
- 修复首页卡片设置保存失败时没有错误提示的问题
- 修复托盘测速与代理页行为不一致的问题，移除托盘「测试延迟」入口
- 修复通过 URL 导入订阅时，即使导入的订阅并非当前使用的订阅，也会重新加载当前配置
- 修复 首页 网站测速失败后卡片一直显示测试中
- 修复 代理 页展开分组后不显示最新测速结果，需切换节点才刷新
- 修复 代理 在全局模式下无法展开节点组

**🐧 Linux**

- Linux：修复 deb/rpm 安装包错误包含多余的 `frontend-contract` 可执行文件，导致下游重新打包失败的问题

</details>

<details>
<summary><strong> ✨ 新增功能 </strong></summary>

- 新增 IPinfo 检测服务与独立启用开关，全部关闭时使用 IPPure
- 新增首页网站测试的内置网站预选开关，保留自定义添加方式
- 首页 IP 信息卡片整合 IP 属性与质量、网络纯净度和风险检测（匿名性、滥用、黑名单、攻击记录、WebRTC 泄漏），可添加多个 ipapi.is / cleanip.io 检测服务并回退到公开接口，自动刷新间隔可自定义
- 新增虚拟网卡设置的「DNS 模式」选项，支持配置 mihomo 系统 DNS 行为
- 新增「IP 信息」自动刷新开关，关闭后仍可手动刷新
- 新增 Muse AI 解锁检测，针对 Muse AI 特有的 Cloudflare 人机验证增加「Risky」状态标记

</details>

<details>
<summary><strong> 🚀 优化改进 </strong></summary>

- 优化首页 IP 信息布局与属性配色，精简说明并支持多平台汇总、风险分档和来源提示
- 优化「链式代理」：开启前需确认网速影响提示，空面板新增「关闭」按钮

**🖥️ Windows**

- Windows 系统代理默认绕过 `*.local` 域名，访问局域网设备的 `.local` 主机名时不再经过代理

</details>
