---
layout:    post
title:     "CRA中的import"
date:      2020-12-14 00:56:00 +0800
category:  "webapck"
tags:      ["webpack", "create-react-app"]
excerpt:   "最近使用react开发一个前端项目，项目是使用 `Create-React-App` 创建的。前几天一个页面需要代码编辑器，在github上搜索了一番，决定使用 [React-Ace](https://github.com/securingsincity/react-ace) 。但是在文件加载上遇到了一些问题，下面是我解决问题的思路。"
---


最近使用react开发一个前端项目，项目是使用 `Create-React-App` 创建的。前几天一个页面需要代码编辑器，在github上搜索了一番，决定使用 [React-Ace](https://github.com/securingsincity/react-ace) 。但是在文件加载上遇到了一些问题，下面是我解决问题的思路。


## Ace编辑器

### 简单例子

按照 [React-Ace](https://github.com/securingsincity/react-ace) 文档，我们可以很轻松的在项目中使用Ace编辑器。该编辑器可以提供代码高亮、语法提示、代码提示、自动缩进等功能，我们能很方便的开发出我们需要的编辑器。

```js
import React, {Component} from "react";
import { render } from "react-dom";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-json";           // 加载json的语法高亮规则
import "ace-builds/src-noconflict/theme-github";        // 加载编辑器的主题样式


class AceJsonEditor extend Component {
    render {
        return (
            <AceEditor mode="json"
                       theme="github"
                       editorProps={{ $blockScrolling: true }}
                       { ...this.props }
                    />
        );
    }
}


export default AceJsonEditor;
```

### 出现的问题

很快我们就能在界面上看到一个所见即所得的代码编辑器，但是检查浏览器控制台会发现有两行错误:

````
Refused to execute script from 'http://localhost:4001/worker-json.js' because its MIME type ('text/html') is not executable.
Uncaught DOMException: Failed to execute 'importScripts' on 'WorkerGlobalScope': The script at 'http://localhost:4001/worker-json.js' failed to load.
````

这两行错误对应的其实是一个问题: 一个`worker-json.js`的可执行脚本没有被加载进代码。因为看到是js后缀的文件，第一反应当然是在 `node_modules` 下的 `ace-builds` 中找到这个文件并加载到项目中。但是这么操作之后，错误仍然还在。

## 解决方案

之后，我便去查看 `React-Ace` 的文档和github issue。终于在一个用户反馈相同问题的issue下，找到了开发者社区给的答案。issue - [Could not load worker](https://github.com/securingsincity/react-ace/issues/725#issuecomment-543109155) ，开发者社区给了三种解决方案，如下：

### 1. 全部编译

我们可以加载 `webpack-resolver` 这个文件，它会帮我们搞定一切，加载需要的代码、以及设置必须要的选项。但是，当使用这种方案之后，会发现编译时间会大大增加，编译后的项目大小也剧增。

````js
import "ace-builds/webpack-resolver";
````

其实我们查看 `webpack-resolver` 这个文件，会发现其实开发在这个文件中将可能需要加载的文件、可能需要设置的选项全部都做了。也就是说，当我们import了 `webpack-resolver` 这个文件，其实就是将整个ace编辑器都编译到了我们的项目，这明显不是我们想要的。下面的代码只是这个文件的冰山一角：

````js
ace.config.setModuleUrl('ace/ext/beautify', require('file-loader?esModule=false!./src-noconflict/ext-beautify.js'))
ace.config.setModuleUrl('ace/ext/code_lens', require('file-loader?esModule=false!./src-noconflict/ext-code_lens.js'))
...

ace.config.setModuleUrl('ace/mode/json', require('file-loader?esModule=false!./src-noconflict/mode-json.js'))
ace.config.setModuleUrl('ace/mode/json5', require('file-loader?esModule=false!./src-noconflict/mode-json5.js'))
ace.config.setModuleUrl('ace/mode/jsoniq', require('file-loader?esModule=false!./src-noconflict/mode-jsoniq.js'))
...

ace.config.setModuleUrl('ace/mode/json_worker', require('file-loader?esModule=false!./src-noconflict/worker-json.js'))
ace.config.setModuleUrl('ace/mode/lua_worker', require('file-loader?esModule=false!./src-noconflict/worker-lua.js'))
...
````

### 2. 使用外链

当我们使用上面的方法编译时，也差不多可以了解到：其实对于我们现在的这个json编辑器而言，我们需要引入一个叫 `worker-json.js` 的文件，并且全局设置 `ace/mode/json_worker` 这个选项的值。这里的引入不是将 `worker-json` 中的代码加载到我们的这个json编辑器模块，而是单独将 `worker-json` 静态加载并返回编译后的url，然后通过将该url地址全局设置。

这个过程其实有点类似我们通常在项目中引入图片或者其他静态文件。其实想到这里，既然这里实际做的事情是：将静态文件的url设置到全局变量ace中。如果我们已经知道这个静态文件的地址，或者在某个地方有个一模一样的静态文件存放着，我们是不是可以直接拿来使用呢？

````js
import ace from "ace-builds";

ace.config.setModuleUrl('ace/mode/json_worker', "https://cdn.jsdelivr.net/npm/ace-builds@1.4.3/src-noconflict/worker-json.js");
````

上面我们使用了托管在CDN上的一个相同文件url作为外链，直接设置到全局变量，果然项目可以正常运行了。但是经过几番考虑，还是放弃了这种方案。虽然这个方案是最简单、最省事、最省力的，但同时也伴随着风险。其一，如果托管在CDN上的文件到期且没续费，那么我们项目将会收到影响；其二，即使该文件一直存在，如果我们项目后期需要对 `React-Ace` 进行升级，我们还需要另外再去寻找对应的稳定外链；其三，如果项目换了人员维护，以后对于 `React-Ace` 的处理可能会被忽视，对于后期维护是个麻烦。

### 3. 部分编译

最后一种方案，当然也是最优方案，我们只需要将项目中用到的部分加载即可。是不是很方便？

````js
import ace from "ace-builds";
import jsonWorkerUrl from "file-loader!ace-builds/src-noconflict/worker-json";

ace.config.setModuleUrl("ace/mode/json_worker", jsonWorkerUrl);
````

如果这样就能搞定，我也不会写这篇文章了。这次直接编译报错了: `Unexpected '!' in 'file-loader?esModule=false!ace-builds/src-noconflict/worker-json'.`。很显然语法错误，导致编译失败。

## Webpack

项目是用 `Create-React-App` 搭建的，是react官方团队为了方便用户创建的react开发环境的一个脚手架工具。这个环境下，默认使用 `Bable` 来编译，使用 `Webpack` 来打包。所以想要解决上面的问题，我们还得从 `Webpack` 突破。

经过查看 [Webpack](https://webpack.js.org/concepts/) 文档和谷歌搜索，终于到了一丝头绪。文档原文如下：

```
loader让webpack能够去处理那些非JavaScript文件(webpack 自身只理解 JavaScript)。loader可以将所有类型的文件转换为webpack能够处理的有效模块，然后你就可以利用webpack的打包能力，对它们进行处理。
```

在 `Webpack` 中经常使用的loader有:

 - `style-loader` : 创建style标签，将css注入到DOM

 - `css-loader` : 通过import或require引入css文件，得到的是一个css对象数组，需要配合 `style-loader` 使用

 - `js-loader` : 通过import或require引入js文件及其依赖

 - `ts-loader` : 通过import或require引入ts文件及其依赖

 - `file-loader` : 将文件解析为url，并引入到代码中

 - `url-loader` : 与 `file-loader` 类似，将文件解析为一个base64格式的url

 - `raw-loader` : 将文件解析为string，并引入到代码

 - `eslint-loader` : 将eslint加载到代码

 - `babel-loader` : 使项目能编译(transpile)js文件

在项目中，我们可以通过三种方式来使用使用loader：

 - 配置: 在 `webpack.config.js` 文件中指定 `loader`

 - 内联: 在每个 `import` 或者 `require` 语句中显式指定 `loader`

 - CLI: 在 shell 命令中指定 `loader`

### 修改配置

在 `Webpack` 的配置中, `loader` 有两个属性可以配置：

1. `test` : 用于标识出应该被对应的 `loader` 进行转换的某个或某些文件。

2. `use` : 表示进行转换时，应该使用哪个 `loader` 。

如果我们能修改 `Webpack` 配置，将我们需要加载的文件的正则模式指定给 `test` 属性, 将我们需要用到的file-loader 指定给 `loader` 属性，那我们就可以在代码中使用 `import xxx from "file-loader!xxxpath"`。

`Create-React-App` 为我们搭建开发环境带来了便利，但同时也因为隐藏了很多细节，导致我们不能对整个开发环境进行定制。所以在原始状态下，我们根据就找不到`Webpack` 的配置文件。

####  eject

如果我们想要修改webpack配置，需要在命令行使用 `npm run eject` 或者 `yarn eject` 来暴露原本隐藏在背后的一些配置，实际上是通过你的包管理器执行了 `react-scripts eject` 。eject操作时不可逆的，我们没法回滚到之前的简洁模式的，虽然这样我们可以对构建工具和配置选项完全自定义。

执行命令后，我们可以在项目根目录下发现多了2个文件夹configs和scripts，我们将要修改的 `Webpack` 配置文件就在那里。 `configs/webpack.config.js` 对应正式环境， `configs/webpackDevServer.config.js`。找到文件中的 `module.rules` 层级:

````js
module.exports = {
    ...
    module: {
        ...
        rules: [
            ....
            {
                test: /\.(js|mjs|jsx|ts|tsx)$/,
                include: paths.appSrc,
                loader: require.resolve('babel-loader'),
            },
            ...
            {
                oneOf: [
                    ...
                    {
                        loader: require.resolve('file-loader'),
                        exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
                        options: {
                            name: 'static/media/[name].[hash:8].[ext]',
                        },
                    },
                ]
            }
        ]
  }
};
````

我们可以看到js、mjs、jsx、ts、tsx等后缀的文件，被 `babel-loader` 加载，而 `file-loader` 刚好会忽略加载这些后缀的文件。如果想要我们上面的 `worker-json.js` 文件被 `file-loader` 加载，配置可以这么写:

````js
module.exports = {
    module: {
        rules: [
            {
                test: /ace-builds.*\/worker-.*$/,
                loader: 'file-loader',
                options: {
                    esModule: false,
                    name: '[name].[hash:8].[ext]',
                },
            },
        ],
    },
};
````

这样配置之后，我们可以直接import，而不需要使用 `xxx-loader!` 这种内联方式:

```
import jsonWorkerUrl from "ace-builds/src-noconflict/worker-json";
```

#### rewire

如果不想暴露全部配置，也不想大幅修改默认配置，只想修改部分webpack配置呢？我们可以通过安装`react-app-rewired`来实现。

````shell
npm install react-app-rewired --save-dev
## 或者
yarn add react-app-rewired --dev
````

安装成功之后，我们在src同级的根目录新建一个 `config-overrides.js` 文件。如果想要放置到指定路径，在 `package.json` 中设置 `config-overrides-path` ：

````js
"use strict";

module.exports = (config, env) => {
    config.module.rules = config.module.rules.push({
        test: /ace-builds.*\/worker-.*$/,
        loader: 'file-loader',
        options: {
            esModule: false,
            name: '[name].[hash:8].[ext]',
        },
    });

    return config;
};
````

想要成功通过 `react-app-rewired` 加载我们修改后的配置文件，需要修改 `package.json` 文件，将常用命令中的 `react-scripts` 替换为 `react-app-rewired`，然后通过yarn或者npm启动项目，我们就可以使配置生效了:

````json
{
    "scripts": {
        "start": "react-app-rewired start",
        "build": "react-app-rewired build",
        "test": "react-app-rewired test",
        "eject": "react-scripts eject"
    }
}
````

### 内联

`Webpack` 是原生支持通过内联的方式来指定loader来加载文件的(只要项目中依赖了`xxx-loader` )。内联方式和上面修改配置是等效的:

````
## 使用!将loader和指定资源分开
import "file-loader!ace-builds/src-noconflict/worker-json";

## 还可以通过qs格式或者json格式传递参数,
import "file-loader?esModule=false!./src-noconflict/worker-json.js"
import "file-loader?{"esModule":false}!./src-noconflict/worker-json.js"
````

为什么在当前 `Create-React-App` 创建的环境中，直接使用内联方式书写会报语法错误呢？重新搜索线索，我们可以在编译错误中找到，最后一句写着: "Do not use import syntax to configure webpack loaders  import/no-webpack-loader-syntax", 这应该是最关键的一句了，通过谷歌搜索关键词 `import/no-webpack-loader-syntax` ，我们可以找到一篇文档 [import/no-webpack-loader-syntax](https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/no-webpack-loader-syntax.md) 。大概意思就是，有一个webpack插件叫 `eslint-plugin-import` ，使用该插件我们可以在 `Webpack` 中禁止loader语法。如下:

````js
const moduleWithOneLoader = require("my-loader!./my-awesome-module");
// 或者
import myModule from "my-loader!./my-awesome-module";
````

搜索 `react-scripts` 的package.json文件，在依赖中果然有 `eslint-plugin-import` 这个插件。在 `node_modules` 目录下可以找到 `eslint-config-react-app` ，里面声明了 `Create-React-App` 的默认eslint配置，其中有一行:

````js
...
    'import/no-webpack-loader-syntax': 'error',
...
````

就是这行阻止了 `Webpack` 默认的内联方式加载文件。既然找到了问题，那么解决方法就很简单。直接修改eslint配置(前提是暴露配置，然后对配置进行修改)，整个项目中就都可以用内联的方式指定loader。当然，还有一个更简单的办法，通过注释就可以对单行的eslint规则进行关闭：

````js
import ace from "ace-builds";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-github";
/* eslint import/no-webpack-loader-syntax: off */
import jsonWorkerUrl from "file-loader?esModule=false!ace-builds/src-noconflict/worker-json";
import AceEditor from "react-ace";

ace.config.setModuleUrl('ace/mode/json_worker', jsonWorkerUrl);
````

众里寻他千百度。蓦然回首，那人却在，灯火阑珊处。

这里你可能比较困惑，为什么 `Create-React-App` 要默认通过插件禁止 `Webpack` 的这个行为呢？因为这种语法，只是在 `Webpack` 中特有的，并不符合标准。如果我们代码转移到别的前端打包工具，那么 `Webpack` 特有语法将会产生很多兼容问题。

### CLI

命令行不清楚能不能写复杂的模式绑定，暂时就不研究了。

至此，大功告成！

---
来源:

[Ace Editor](https://github.com/securingsincity/react-ace/blob/master/docs/Ace.md)

[Could not load worker #725](https://github.com/securingsincity/react-ace/issues/725#issuecomment-543109155)

[react-app-rewired](https://github.com/timarney/react-app-rewired/blob/HEAD/README_zh.md)

[import/no-webpack-loader-syntax](https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/no-webpack-loader-syntax.md)

[import/no-webpack-loader-syntax](https://nicedoc.io/benmosher/eslint-plugin-import/blob/master/docs/rules/no-webpack-loader-syntax.md)