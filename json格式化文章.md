**大家好，我是小富～**

这期给大家分享一个我开发的工具！

最近做了一个开发者专属的 JSON 工具 **easy-json**！在线体验地址：[easyjson.xiaofucode.com](https://easyjson.xiaofucode.com)，不管是什么奇形怪状的 JSON 字符串，扔进去都能智能解析，先看效果是不是还挺能打的

![](https://fire-blog.oss-cn-beijing.aliyuncs.com/img/20260619104551.png)

现在网上这类工具确实不少，我也用过很多，uTools 上的各种小插件、在线网页版、浏览器扩展，多多少少都在用。但总有些场景它们搞不定，这也是我决定自己动手的原因。

### 起因：一个来自夫人的需求

做这个工具的初衷，说出来可能有点意外，是因为我夫人。

她做测试的，经常要去 Kibana 上查日志，看接口的入参出参，时不时还要做 JSON 对比。有一天我看她在那费劲巴力地从一大坨日志里复制了一段 JSON，结果这段 JSON 根本不是标准格式，是那种 Java 对象直接 `toString()` 输出的：

```json
UserEntity@3f2a1c{id=10042, username=zhangsan, email=zhangsan@example.com, roles=[ADMIN, USER], department=DepartmentVO{id=5, name=技术部, manager=null}, createdAt=2024-01-15T09:30:00, lastLogin=2025-06-01T14:23:07, active=true}
```

她只能一个字段一个字段地手动修正。我说有格式化工具你咋不用呢？她说试过了，没一个能解析这种格式的。

我也找了一圈，发现还真没有。想着能帮她省点事儿，就决定自己搞一个。仔细想想，这种场景我自己平时遇到得更多，干脆就做全了。


下面就介绍一下这个工具的核心能力，看看能不能戳中你的痛点。

### 智能提取 100+ 种格式

这个工具支持 **100+ 种格式**的 JSON 字符串智能提取，覆盖各主流编程语言常见的 JSON 变体，自动识别并格式化为标准 JSON。

比如后端开发图省事儿，直接 `toString()` 输出对象，这种格式不借助工具或 AI，想手动改成标准 JSON 还挺费劲的

```java
OrderDTO{orderId=ORD-20250601-001, userId=10042, totalAmount=1299.00, status=PAID, items=[ItemDTO{sku=SKU-8821, name=机械键盘, qty=1, price=899.00}, ItemDTO{sku=SKU-3310, name=鼠标垫, qty=2, price=200.00}], createTime=2025-06-01T10:30:00, payChannel=ALIPAY}
```

扔进 easy-json，一键提取

![](https://fire-blog.oss-cn-beijing.aliyuncs.com/img/20260619111259.png)

前端的代码片段也不在话下，直接粘贴就能提取出 JSON

```typescript
export const API_CONFIG: Record<string, any> = {
  baseURL: 'https://api.example.com/v2',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Version': '2.1.0',
  },
  retry: { maxRetries: 3, delay: 1000, backoff: 2 },
  endpoints: ['/users', '/orders', '/products'],
} as const;
```

### 网页 JSON 一键提取

为了减少复制粘贴的操作，我专门做了一个**浏览器插件**。在网页上选中文本后，右键选择「easyjson 智能提取」，插件会自动在新标签页中打开并完成提取，省去了一堆不必要的操作。

![](https://fire-blog.oss-cn-beijing.aliyuncs.com/img/20260620004136_rec_.gif)

### JSON 语义对比

JSON 对比是我自己用得很多的一个场景。网上找了不少工具，但总觉得达不到预期，两段 JSON 字段相同、只是顺序不同，很多工具直接逐行对比，结果一大片标红，根本分不清哪些是真正的差异。而且即便顺序一致了，也只是标出整行不同，并不会精确到具体哪个值变了。

![](https://fire-blog.oss-cn-beijing.aliyuncs.com/img/20260619112330.png)

easy-json 的对比逻辑是：**先做结构正规化，再逐层 Diff**。智能识别新增、删除、修改三种变更类型，支持**字符级差异高亮**，内容差异一目了然。

![](https://fire-blog.oss-cn-beijing.aliyuncs.com/img/20260619112515.png)

### 四种视图一键切换

为了适配不同的查看需求，我做了**四种视图模式**：代码视图、树形视图、拓扑视图、表格视图，一键切换，不用再开别的工具。

有时候你可能需要折叠层级，有时候又想用更直观的方式纵览全局，拓扑图和表格视图在这些场景下就非常好用。

![](https://fire-blog.oss-cn-beijing.aliyuncs.com/img/20260620004308_rec_.gif)

### 自动粘贴 & 自定义开关

工具内置了一系列可自定义的开关：是否自动粘贴、是否按 Key 排序、是否过滤空值、是否开启智能提取、是否自动格式化……所有行为都可以按自己的习惯来配置。

![](https://fire-blog.oss-cn-beijing.aliyuncs.com/img/20260620004655_rec_.gif)

### 多 Tab & 状态持久化

这个功能上线后我夫人反馈特别好。她经常需要同时对比多组 JSON，有时候遇到新问题还要翻之前用过的参数，又不想开一堆浏览器窗口。多 Tab 模式可以轻松管理多个工作区，**双击 Tab 还能自定义名称**，也不怕搞混了。

![](https://fire-blog.oss-cn-beijing.aliyuncs.com/img/20260620004920_rec_.gif)

### 格式转换

有时候需要把 JSON 转成 XML、YAML 等其他格式，手动改太麻烦了。我支持**一键格式转换**，省心省力。

![](https://fire-blog.oss-cn-beijing.aliyuncs.com/img/20260620005328_rec_.gif)

### 主题配色

为了让用（摸）户（鱼）体验更好，我还做了 JSON 的配色主题和系统主题色切换，颜值也在线。

![](https://fire-blog.oss-cn-beijing.aliyuncs.com/img/20260620005606_rec_.gif)


### 安装说明

为了覆盖不同使用场景，easy-json 提供了三个版本：**浏览器插件**、**Mac 客户端**、**Windows 客户端**。

![](https://fire-blog.oss-cn-beijing.aliyuncs.com/img/20260619110349.png)

不过由于上架浏览器商店和申请 Mac 开发者证书都需要费用，我太穷了就没开通，所以安装上有一点点小门槛

浏览器插件，目前是离线版本，需要手动安装：`管理扩展程序 → 打开开发者模式 → 加载已解压的扩展程序`。

![](https://fire-blog.oss-cn-beijing.aliyuncs.com/img/20260620010246.png)

Mac 版本，由于没有开发者证书签名，安装时会提示"不受信任"，需要前往 `系统偏好设置 → 安全性与隐私 → 仍要打开` 允许安装。

Windows 版本，没啥门槛，双击安装即可。


### 写在最后

这个工具**完全免费**，有需要的小伙伴可以去 [easyjson.xiaofucode.com](https://easyjson.xiaofucode.com) 体验一下。

项目也已经开源在 GitHub 上，欢迎 Star 支持，有问题随时提 Issue，也非常欢迎 PR 贡献！

希望 easy-json 能帮你在日常开发中少折腾一点，多高效一点！   


如果遇到了问题，可以通过以下方式联系我。

也欢迎加入我们的技术交流群，群里都是热心的Javaer，会讨论技术问题，互相帮助，相信能让您获得更多收获。

