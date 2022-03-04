---
layout:     post
title:      "[译] 了解Nodejs事件驱动架构"
date:       2017-05-08 20:19:00 +0800
category:   "Nodejs"
tags:       ["EventEmitter", "Nodejs"]
excerpt:    "Nodejs的大部分对象(比如HTTP requests、responses和stream)继承(implement)自`EventEmitter`模块，从而可以发布和监听事件。"
---

Nodejs的大部分对象(比如HTTP requests、responses和stream)继承(implement)自`EventEmitter`模块，从而可以发布和监听事件。

````javascript
const EventEmitter = require('events');
````

事件驱动类型最简单的形式，就是流行的Nodejs函数的回调方式，比如`fs.readFile`。在这个例子中，当Nodejs准备好调用回调函数时，事件将会被触发一次，回调作为事件处理器。我们先来探讨这种基本形式。

## Node，准备好时调用

在JavaScript添加promise原生支持和async/await特性前，Nodejs处理异步事件的原始方式是回调。因为function在JavaScript中是一等公民，回调一般是传递给其他函数的函数。我们需要知道，回调并不代表代码中的异步调用，因为一个函数既可以被同步调用，也可以被异步调用。

例如，有一个函数`fileSize`，它接受一个回调函数`cb`，并且可以基于一个条件来同步或异步地被调用:

````javascript
function fileSize (fileName, cb) {
    if (typeof fileName !== 'String') {
        // 同步调用cb
        return cb(new TypeError('argument should be string'));
    }
    fs.stat(fileName, (err, stats) => {
        // 异步调用cb
        if (err) { return cb(err); }
        // 异步调用
        cb(null, stats.size);
    });
}
````

请注意，这种是导致异常错误的错误示例，设计function最好始终同步或异步地使用回调。我们来探讨一个典型的异步Nodejs函数的实例，使用回调形式来书写:

````javascript
const readFileAsArray = function (file, cb) {
    fs.readFile(file, function (err, data) {
        if (err) {
            return cb(err);
        }
        const lines = data.toString().trim().split('\n');
        cb(null, lines);
    });
}
````

`readFileAsArray`接受一个文件路径和一个回调函数，该函数读取文件内容，并将其分割成行数组，并且调用携带该数组的回调函数。这里有个例子，假如我们将`numbers.txt`放在该目录下，文件内容如下:

````text
10
11
12
13
14
15
````

如果我们有个统计该文件中奇数的任务，我们可以使用`readFileAsArray`函数来简化这个操作:

````javascript
readFileAsArray('./numbers.txt', (err, lines) => {
    if (err) throw err;
    const numbers = lines.map(Number);
    const oddNumber = numbers.filter(n => n%2 === 1);
    console.log('Odd numbers count:', oddNumber.length);
});
````

代码将数字内容读入一个字符串数组，然后将其解析成数字，并且统计奇数个数。

这里纯粹使用Node的回调方式，callback函数的第一个参数`err`为null，并且将最后一个参数传递给host函数。你应该一直使用这样的形式，因为可能会被使用到。将回调函数作为host函数的最后一个参数，并且将可能的error对象作为回调函数的第一个参数。

### 现代JS的callback替代

在现代JavaScript中，有promise对象，promise对象可以替代异步API的回调函数。promise对象允许我们去分开操作success和error的情况，而不是将回调函数作为参数传递给host函数并在同样的地方处理error。而且promise对象允许我们链式调用多个异步API，而不需要嵌套使用。

如果`readFileAsArray`函数支持promise，我们可以这样写代码:

````javascript
readFileAsArray('./numbers.txt')
    .then(lines => {
        const numbers = lines.map(Number);
        const oddNumber = numbers.filter(n => n%2 === 1);
        console.log('Odd numbers count:', oddNumbers.length);
    })
    .catch(console.error);
````

我们这里调用`.then`函数来获取host函数的返回值，而不是传递一个回调函数。`.then`函数通常可以让我们访问和回调函数版本相同的行数组，也可以让我们像之前那么处理它。为了处理error，我们在结果上增加一个`.catch`函数调用，允许我们在error发生时访问它。

在现代JavaScript中new一个Promise对象，可以使host函数更容易支持promise接口。除了已经支持的回调接口外，我们可以修改`readFileAsArray`函数来支持promise接口:

````javascript
const readFileAsArray = function (file, cb = () => {}) {
    return new Promise( (resolve, reject) => {
        fs.readFile(file, function (err, data) {
            if (err) {
                reject(err);
                return cb(err);
            }

            const lines = data.toString().trim().split('\n');
            resolve(lines);
            cb(null, lines);
        });
    });
};
````

为了使函数返回一个Promise对象，我们包裹`fs.readFile`异步调用。promise对象会暴露两个参数，一个resolve函数，一个reject函数。

当我们想调用带error的回调函数时，同时会使用promise的`reject`函数;当我们想调用带data的回调函数时，同时会使用`resolve`函数。在这种情况下，我们唯一需要做的是，在代码和promise接口一起使用时，给回调函数参数设置默认值。我们可以在参数中使用一个简单的默认空函数:`() => {}`。

### 用async/await消费promise

当需要循环异步函数时，增加promise接口可以使代码更容易使用。如果使用回调函数，事情可能会变得一团糟。Promise是这种情况改善了一点，函数生成器又改进了一点。异步代码更现代化的方式是，是使用`async`函数，可以允许我们像同步代码一样处理异步代码，从而使代码可读性更强。

下面是使用`async/await`来消费`readFileAsArray`函数:

````javascript
async function countOdd () {
    try {
        const lines = await readFileAsArray('./numbers.txt');
        const numbers = line.map(Number);
        const oddCount = numbers.filter(n => n%2 === 1).length;
        console.log('Odd numbers count:', oddCount);
    } catch (err) {
        console.log(err);
    }
}
````

我们先创建一个异步函数，这只是一个`async`关键字作为前缀的普通函数。在异步函数内部，使用关键字`await`，可以让调用`readFileAsArray`函数就像返回lines变量一样。可以像`readFileAsArray`函数调用是同步一样，继续执行代码。我们执行async函数来获取运行的数据，这样非常简单，而且可读性很好。如果想处理错误，我们需要将异步调用包含在`try/catch`语句中。

有了`async/await`特性，我们不需要去使用特殊的API(像`.then`和`.catch`)。我们只需要在代码中标记不同的函数，使用纯粹的JavaScript。我们可以在任何支持promise接口的函数上使用`async/await`特性，但是不能在回调风格的函数上使用(例如`setTimeout`)。

## EventEmitter模块

EventEmitter是Node中促进对象通讯的模块，也是Node异步事件驱动架构的核心。Node中很多内置模块都继承自EventEmitter。

概念很简单: emitter对象发布命名事件，导致之前注册的监听器被调用。所以一个emitter对象基本有两个特性:

- 发布命名事件
- 注册和注销监听器函数

要使用EventEmitter，我们只需要创建一个继承自EventEmitter类的子类:

````javascript
class MyEmitter extends EventEmitter {

}
````

Emitter对象是基于EventEmitter类的实例化对象:

````javascript
cpnst myEmitter = new MyEmitter();
````

在emitter对象生命周期的任何时间，我们可以使用emit函数发布任何我们想要的命名事件:

````javascript
myEmitter.emit('something-happened');
````

发布一个事件是发生某种情况的信号，这种情况一般是关于emitter对象的状态变化。我们可以使用`use`方法来添加监听器函数，每次emitter对象发布关联的命名事件时，这些监听器函数就会被执行。

## Events不等于异步

我们来看一个例子:

````javascript
const EventEmitter = require('events');

class WithLog extends EventEmitter {
    execute (taskFunc) {
        console.log('Before executing');
        this.emit('begin');
        taskFunc();
        this.emit('end');
        console.log('After executing');
    }
}

const withLog = new WithLog();
withLog.on('begin', () => console.log('About to execute'));
withLog.on('end', () => console.log('Done with execute'));

withLog.execute(() => console.log('*** Executing task ***'));
````

`WithLog`类是一个事件发布器，它定义了一个实例函数`execute`，这个`execute`函数接受一个参数--任务函数，一个包裹着log的执行语句。它会在执行之前和执行之后触发事件。

我们来看下这里执行的顺序，我们在两个命名事件上注册了监听器，最后触发事件之后执行一个简单的任务，下面是输出:

````text
Before executing
About to execute
*** Executing task ***
Done with execute
After executing
````

我们可以注意到上面的输出，都是同步执行的，这段代码中没有任何异步。

- 我们先得到"Before executing"行
- 发布"begin"命名事件，并触发输出"About to execute"行
- 实际的执行语句，输出" ***Executing task*** "行
- 发布"end"命名事件，并触发输出"Done with execute"行
- 最后得到"After executing"行

就像普通的回调函数一样，不要认为events就意味着同步或异步代码。这很重要，当我们将一个异步`taskFunc`函数传递给`execute`函数，发布的事件将不再准确。我们可使用`setImmediate`调用来模拟这种情况:

````javascript
// ...
withLog.execute(() => {
    setImmediate(() => {
        console.log('*** Executing task ***');
    });
});
````

现在输出就变成了这样:

````text
Before executing
About to execute
Done with execute
After executing
*** Executing task ***
````

异步调用之后，触发"Done with execute"和"After executing"调用，这种情况不再准确，是错误的。当异步函数完成之后发布一个事件，我们需要将回调函数(或promise函数)和基于事件的通讯相结合，后面的例子可以证实这点。

使用events而不是常规回调函数的好处是，我们可以通过定义多个监听器来对多次相同的信号作出反应。回调函数为了完成同样的操作，需要在单个可用回调中写更多的逻辑。对于应用来说，events是一种允许多个外部插件在应用核心上去实现功能的好办法，你可以将其当作围绕状态改变的自定义hook点。

## 异步Events

我们现在将同步样例转换为异步代码，可以实现更多实用功能:

````javascript
const fs = require('fs');
const EventEmitter = require('events');

class WithTime extends EventEmitter {
    execute (asyncFunc, ...args) {
        this.emit('begin');
        console.time('execute');
        asyncFunc(...args, (err, data) => {
            if (err) {
                return this.emit('error', err);
            }

            this.emit('data', data);
            console.timeEnd('execute');
            this.emit('end');
        });
    }
}

const withTime = new WithTime();
withTime.on('begin', () => console.log('About to execute'));
withTime.on('end', () => console.log('Done with execute'));

withTime.execute(fs.readFile, __filename);
````

`WithTime`类执行了一个`asyncFunc`函数，并且通过调用`console.time`和`console.timeEnd`来显示`asyncFunc`函数消耗的事件。在执行前后，`execute`函数发布了对应的事件序列，并且异步调用普通信号时发布了error和data事件。

我们通过传递一个`fs.readFile`(异步函数)调用来测试`withTime`emitter触发器，而不是使用回调来处理文件数据，我们现在就可以监听'data'事件了。当我们执行代码时，我们可以获取事件的正确顺序，和预期一样获得该执行时间的报告:

````text
About to execute
execute: 4.507ms
Done with execute
````

现在我们需要将回调函数和一个事件emitter触发器结合起来，如果`asyncFunc`也支持promise，我们可以使用async/await特性来实现:

````javascript
class WithTime extends EventEmitter {
    async execute (asyncFunc, ...args) {
        this.emit('begin');
        try {
            console.time('execute');
            const data = await asyncFunc(...args);
            this.emit('data', data);
            console.timeEnd('execute');
            this.emit('end');
        } catch (err) {
            this.emit('error', err);
        }
    }
}
````

对于我来说，这样比基于回调或者`.then/.catch`的代码可读性更好。`async/await`特性使我们尽可能关注JavaScript语言本身，这是一个大进步。

## Events参数和错误

在前面的例子中，有两个带额外参数的事件被发布。

error事件和一个error对象一起被发布:

````javascript
this.emit('error', err);
````

data事件和一个data对象一起被发布:

````javascript
this.emit('data', data);
````

我们可以在命名事件后面，使用更多我们需要的参数，所有这些参数在我们为该命名事件注册监听器函数中都是可用的。例如，我们注册一个监听器函数来处理data事件，获取和event一起传递过来的data参数，data对象正是`asyncFunc`暴露的。

````javascript
withTime.on('data', (data) => {
    // 对data对象进行操作
});
````

`error`事件通常需要特殊处理。在前面基于回调的例子中，如果我们没有使用监听器来处理error事件，node进程将会退出。为了证实这点，我们调用一个带错误参数的方法:

````javascript
class WithTime extends EventEmitter {
    execute (asyncFunc, ...args) {
        console.time('execute');
        asyncFunc(...args, (err, data) => {
            if (err) {
                return this.emit('error', err); // 不处理error
            }
            console.timeEnd('execute');
        })
    }
}

const withTime = new WithTime();

withTime.execute(fs.readFile, '');        // 错误调用
withTime.execute(fs.readFile, __filename);
````

上面的第一个执行调用将会触发一个错误，node进程将会崩溃并退出；第二次执行调用将会受到进程崩溃的影响，可能根本不会被执行:

````text
events.js:163
      throw er; // Unhandled 'error' event
      ^
Error: ENOENT: no such file or directory, open ''
````

如果我们为这个特殊的`error`事件注册一个监听器，node进程的的行为将发生变化:

````javascript
withTime.on('error', (err) => {
    // 对err对象进程操作，例如在某处记下log
    console.log(err);
});
````

如果我们做了上面的修改，第一次执行调用产生的错误将会被打印，node进程也不会崩溃和退出。其他的执行调用也能正常完成:

````text
{ Error: ENOENT: no such file or directory, open '' errno: -2, code: 'ENOENT', syscall: 'open', path: '' }
execute: 4.276ms
````

注意，目前Node的行为与基于promise函数不同，后者仅输出一个warning，并且Node进程最终会退出:

````text
UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1): Error: ENOENT: no such file or directory, open ''
DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
````

另一个处理发布错误导致异常的办法是，注册一个监听器来处理全局的`uncaughtException`进程事件。然而，通过全局事件来捕获error并不是一个太好的办法。一个标准的建议是，尽量避免使用`uncaughtException`，但是如果必须监听该进程事件(报告发生了什么，或者做一些清理操作)，应该让Node进程退出:

````javascript
process.on('uncaughtException', (err) => {
    // 一些错误未被处理
    // 执行清除并退出进程
    console.log(err);   // 不要仅仅只打印错误

    // 强制让进程退出
    process.exit(1);
});
````

然而，我们想象一下，当同一时间有多个error事件发生，这意味着上面的`uncaughtException`监听器将会被触发多次，这对于清除操作的代码是个问题。一个比较恰当的例子是，数据库关闭动作将会被多次调用。

`EventEmitter`模块对外还暴露了`once`方法，该方法只会调用一次监听器去发送信号，而不是每次事件发生的时候去调用。所以在实际情况中，该方法应该和`uncaughtException`事件一起使用，因为第一次监听到未捕获的异常，代码将会进行一些清理操作，然后Node进程立即退出。

## 监听器的顺序

如果我们给相同的事件注册多个监听器，这些监听器的调用将会按照顺序(声明的顺序)执行。我们注册的第一个监听器将是第一个被调用的。

````javascript
// 第一个
withTime.on('data', (data) => {
    console.log(`Length: ${data.length}`);
});

// 第二个
withTime.on('data', (data) => {
    console.log(`Characters: ${data.toString().length}`);
});

withTime.execute(fs.readFile, __filename);
````

上面的代码，将会先打印"Length"行，再打印"Characters"行，因为我们定义监听器的顺序就是这样。

如果需要定义一个新监听器，又需要该监听器被先调用，我们可以使用`prependListener`方法:

````javascript
// 第一个
withTime.on('data', (data) => {
    console.log(`Length: ${data.length}`);
});

// 第二个
withTime.prependListener('data', (data) => {
    console.log(`Characters: ${data.toString().length}`);
});

withTime.execute(fs.readFile, __filename);
````

这样，我们就可以先打印"Characters"行。

最后，如果需要移除一个监听器，可以使用`removeListener`方法。

----
来源:

[Understanding Node.js Event-Driven Architecture](https://medium.freecodecamp.com/understanding-node-js-event-driven-architecture-223292fcbc2d)
