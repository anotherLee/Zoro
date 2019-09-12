### 一、开始

大约从半年前开始，就想试着写一个符合规范的Promise，但是一直写不出来，期间也看了不少Promise的文章，但是通常看了一点就看不懂了。最近几天，又仔仔细细地研究了一遍并查阅了很多文章，终于彻底整明白了Promise了。之所以要写这个小系列文章，是因为我觉得网上大部分写Promise实现的文章都有点深，以前我看的时候就看不懂，并不是说写的不好，只是有不少还在学习中的小伙伴看不明白，所以，我决定尽我所能，努力写一个能让大多数前端小伙伴都能看懂的Promise实现，只需要你有Promise的使用经验即可。

这三篇文章，会和你从零起步，**一点一点完成一个完全符合Promise A+规范的Promise，并且完美通过官方提供的872个测试用例。我会把写一个Promise所需要的全部知识和注意点掰开揉碎，全部讲清楚。** 接下来，我们就开始吧！

### 二、通过Promise的使用来理解它的大概形式

关于Promise的实现，我们先不管规范怎样，先看一下它是怎么用的。我们以chrome里原生支持的Promise为例。

```javascript
let promise1 = new Promise(function(resolve, reject) {
  setTimeout(() => { // 模拟一个异步执行
    resolve(1)
  }, 1000)
})

promise1.then(function(res) {
  console.log(res)
}, function(err){
  console.log(err)
})
```

以上是我们使用Promise时经常写的代码，从这些代码来看，我们可以得到以下信息：

- Promise是一个可以new的构造函数
- 它在构造实例，**也就是new的时候接收一个函数作为参数** ，我们先把这个函数叫做executor
- Promise有一个名为then的实例方法

从这些条件中，我们可以对我们自己的MyPromise作出以下的实现：

```javascript
function MyPromise(executor) {
  
} 
MyPromise.prototype.then = function() {
  
}
```

接下来，我们仔细研究一下构造Promise时传递的参数，也就是我上面称之为executor的函数和它的两个参数

### 三、实例化时传递的参数executor

从上面使用Promise的常规代码中，我们可以知道，executor是一个函数，那接下来要明确一件事：**executor是由使用这个Promise的人实现，并由Promise在构造时调用** 。大概就是这样：

```javascript
function MyPromise(executor) {
  executor()
}
MyPromise.prototype.then = function() {
  
}

// 使用MyPromise
// executor是由使用MyPromise的人来写的
function executor(resolve, reject) {
  setTimeout(() => {
    resolve(1)
  }, 1000)
}
let promise1 = new MyPromise(executor)
```

根据使用经验，使用者在写executor时候，会有两个形参resolve和reject，同时，会在适当的时候调用resolve和reject，所以，**resolve和reject都是函数，而且都是在promise内部实现。** 所以，**我们要实现的MyPromise应该包含resolve和reject方法的实现，并在调用时作为实参传递给executor** 。

```javascript
function MyPromise(executor) {
  let resolve = function() {} // resolve和reject名字可以随便起
  let reject = function() {}
  executor(resolve, reject) // 只要调用的时候传递
}
MyPromise.prototype.then = function() {
  
}

// 使用Promise
let promise1 = new MyPromise(function(resolve, reject) {
  setTimeout(() => {
    resolve(1) // resolve或者reject是由使用者调用
  }, 1000)
})
```

其实，在MyPromise内部实现resolve和reject函数的时候不一定叫resolve或者reject，叫a、b甚至阿猫阿狗也行，只要在executor执行的时候传递给它就行。**因为只有这样，使用者在写executor具体内容的时候，可以通过executor的形参拿到它并使用。**

所以，**resolve和reject函数由我们，也就是实现这个MyPromise的人实现，而由使用这个MyPromise的人调用的。** 厘清这一点很重要。

现在，我们实现Promise的代码如下：

````javascript
function MyPromise(executor) {
  let resolve = function() {}
  let reject = function() {}
  executor(resolve, reject)
}
MyPromise.prototype.then = function() {
  
}
````

接下来，是本节的重点，明确MyPromise里resolve和reject函数的功能和实现

### 四、实现resolve和reject函数的两项功能

现在的MyPromise只有一个架子，到这里必须完成resolve和reject两个函数。那么，resovle和reject究竟是干啥的呢？这里，必须要提一些Promise A+规范的内容了。

根据规范，一个Promise的实例可能有三种状态：

- `pending` 未决
- `fulfilled` 成功状态
- `rejected` 拒绝状态，也可以理解成失败状态

之所以会有这三种状态，是因为我们通常用Promise来处理异步操作，而异步操作的结果根据情况可能成功可能失败。

一个Promise在实例化的时候默认是`pending`状态，那么它的状态由谁来改变？答案是由resolve或者reject这两个函数来改变。**当resolve或者reject函数调用时，resolve会把Promise实例由`pending`状态更改为`fulfilled`成功状态，reject函数会把`pending`状态更改为`rejected`状态** 。到这里，resolve和reject这两兄弟的第一个功能就清楚了。

但是，要实现这个功能，就需要在我们的MyPromise里先定义一个状态，然后在resolve和reject里更改

```javascript
function MyPromise(executor) {
  this.status = 'pending' // 默认是pending状态哦
  let resolve = function() {
    this.status = 'fulfilled'
  }
  let reject = function() {
    this.status = 'rejected'
  }
  executor(resolve, reject)
}
MyPromise.prototype.then = function() {
  
}
```

但是，上面的代码是有问题的，一个是this的指向问题，我们在MyPromise构造函数里声明的resolve和reject函数，它的内部this默认都是window，而不是MyPromise实例。这个问题有很多解决，可以将this先存一下，也可以直接使用箭头函数，这里我们就使用箭头函数来解决。

```javascript
function MyPromise(executor) {
  this.status = 'pending' // 默认是pending状态哦
  let resolve = () => {
    this.status = 'fulfilled'
  }
  let reject = () => {
    this.status = 'rejected'
  }
  executor(resolve, reject)
}
MyPromise.prototype.then = function() {
  
}
```

上面的代码还有一个问题，根据规范，**如果一个Promise实例状态改变，就会被固定住，以后它的状态就再也不会更改了。** 也就是说，如果一个Promise实例由`pending`状态变成`fulfilled`状态，就不能再变回`pending`或者`rejected`了。但是我们这个这个不行，你可以把下面的代码粘到浏览器里运行，就会发现问题。

```javascript
function MyPromise(executor) {
  this.status = 'pending' // 默认是pending状态哦
  let resolve = () => {
    this.status = 'fulfilled'
  }
  let reject = () => {
    this.status = 'rejected'
  }
  executor(resolve, reject)
}
MyPromise.prototype.then = function() {
  
}

let promise1 = new MyPromise(function(resolve, reject) {
  setTimeout(() => { // 不要忘了它哦，因为只有在异步下，才能打印promise1实例
    resolve(1)
    console.log(promise1) // 这里是{status: 'fulfilled'} 成功状态
    reject(1)
    console.log(promise1) // 但是到了这里又变成失败状态了
  }, 1000)
})
```

要解决这个问题，也很简单，加上一个if条件判断就可以了，当resolve函数运行时，先看下`this.status`是不是pending状态，如果是，就更改它，如果不是就啥都不做。reject也是如此，这样，当promise的staus状态变化后，再调用resolve或者reject也会被忽略掉了。

```javascript
function MyPromise(executor) {
  this.status = 'pending'
  let resolve = () => {
    // 判断是否是pending状态，如果是就改，不是就啥都不干，这样起到状态固定作用
    if (this.status === 'pending') { 
      this.status = 'fulfilled'
    }
  }
  let reject = () => {
    if (this.status === 'pending') {
      this.status = 'rejected' 
    }
  }
  executor(resolve, reject)
}
MyPromise.prototype.then = function() {
  
}

let promise1 = new MyPromise(function(resolve, reject) {
  setTimeout(() => { // 不要忘了它哦，因为只有在异步下，才能打印promise1的实例
    resolve(1)
    console.log(promise1) // 这里是{status: 'fulfilled'} 成功状态
    reject(1) // 虽然reject了，但是被忽略掉了
    console.log(promise1) // 到这里依然是成功状态
  }, 1000)
})
```

这样，resolve、reject这哥俩的第一个功能完成了。

接下来，我们实现resolve和reject的第二个功能。

有Promise使用经验的小伙伴肯定早就知道：**我们在调用resolve或者reject方法时一般会给它传值，而这个值和then方法的实现息息相关。** 我们先看一下chrome使用Promise的例子：

```javascript
let promise1 = new Promise(function(resolve, reject) {
  setTimeout(() => { // 模拟一个异步执行
    let flag = Math.random() > 0.5 ? true: false
    if (flag) {
      resolve('success') // 传递一个值
    } else {
      reject('fail') // 传递一个值
    }
  }, 1000)
})

promise1.then(function(res) { // 调用resolve传过来的值会被这个函数拿到
  console.log(res)
}, function(err) { // 调用reject传过来的值会被这里拿到
  console.log(err)
}) 
```

从这个例子里，我们可以发现，**resolve和reject调用时传递过来的值，会被then方法执行时传递的两个函数分别作为参数拿到。** 这里我们知道，resolve和reject执行时传过来的值一定被存储起来了，当then方法执行时传递的两个函数在某个时机拿到了它们并执行。

所以，resolve和reject函数的第二个功能也呼之欲出：**将调用时的值存储起来，后面then方法里传递的两个函数会使用它们。**

因为它们分别是成功时和失败时调用的，所以我们需要分开存放。为此，MyPromise需要在构造函数里加两个属性，并在resolve和reject函数执行时赋值。

MyPromise写成如下：

```javascript
function MyPromise(executor) {
  this.status = 'pending'
  this.data = undefined // 用来存入resolve传递过来的值
  this.reason = undefined // 用来存储reject传递过来的值
  
  let resolve = (value) => { // 添加参数，因为使用者调用时一般会给传参
    if (this.status === 'pending') { 
      this.status = 'fulfilled'
      this.data = value
    }
  }
  let reject = (reason) => { // 添加参数，reject表示失败，所以写做失败原因reason
    if (this.status === 'pending') {
      this.status = 'rejected'
      this.reason = reason
    }
  }
  executor(resolve, reject)
}
MyPromise.prototype.then = function() {
  
}
```

其实，resolve和reject传递过来的值放在一个属性里也是可以的，因为promise实例状态一旦更改就不会再变了，也就是resolve和reject只可能执行其中一个，后面即使再执行也会被里面的if条件判断忽略掉。不过为了好对应，我们还是使用两个属性来分别存放resolve和reject函数传过来的值。

写到这里，**resolve和reject分别实现了两个功能。实际上它们兄弟俩每个人都有三个功能，只是第三个功能和then方法密切相关，所以第三个功能需要和then一起写。不过在此之前，我们要先聊聊promise处理异步代码的执行顺序。**

### 五、Promise在处理异步时的执行顺序

我们通过`console.log()`的方式来看chrome里原生支持的Promise处理异步代码时的执行顺序。请仔细看下面的例子：

```javascript
let promise1 = new Promise(function(resolve, reject) {
  console.log(1)
  setTimeout(() => { // 模拟一个异步执行
    let flag = Math.random() > 0.5 ? true: false
    if (flag) {
      resolve('success')
      console.log(2) // 注意这里和reject都是打印2
    } else {
      reject('fail')
      console.log(2)
    }
  }, 1000)
})

console.log(3)

promise1.then(function(res) {
  console.log(res)
}, function(err) {
  console.log(err)
})

console.log(4)
```

如果你把上面的代码贴到浏览器里执行的话，你会发现打印结果是1 3 4 2 success或者fail，我们缕一下这个顺序：

- 当`new Promise`的时候，开始构造实例，传递给构造函数的函数执行，所以先打印出1
- 然后`setTimeout`了，里面的代码需要等到下一个执行序列，然后构造结束，构造出来的实例赋值给变量`promise1`
- `console.log(3)`执行，打印出3
- `promise1.then()`执行，**但是，then方法里面传递的两个函数都没有执行，不然这里就会打印出success或者fail，没有打印说明then方法传递的两个函数都没执行**
- `console.log(4)`执行，打印出4。当前序列结束
- 下一个执行序列开始，之前构造promise1时setTimeout里的代码开始执行
- 根据条件`resolve`或者`reject`执行，然后`console.log(2)`执行，打印2
- 最后，**`then()`方法里传递的两个函数根据条件执行，拿到之前resolve或者reject传递并存储的值，并且执行，打印success或者fail**



总结一下：**当Promise用resolve和reject方法处理异步的代码的时候，then方法先于resolve或者reject执行，但是then方法传递的两个函数此时并未执行，而是等到resolve或者reject执行之后再执行。这其实是一种设计模式：分发订阅模式，也叫观察者模式。**

这个总结如果看不明白没关系，因为接下来就要说它。

### 六、分发-订阅模式和then

分发-订阅模式，也叫观察者模式，它在前端应用是如此的广泛，你几乎在所以的事件机制和异步处理中都可以见到它的身影。我们先举个例子：

```javascript
let app = document.getElementById('app')

app.addEventListener('click', function fn1() {
  console.log(1)
})
app.addEventListener('click', function fn2() {
  console.log(2)
})
app.addEventListener('click', function fn3() {
  console.log(3)
})
```

以上代码对于前端的同学再平常不过，当点击id为app的标签时，fn1、fn2和fn3才会执行。而代码执行到`app.addEventListener`时，相应的函数并未执行，而是等到点击的时候才执行。所以，你可以猜到，fn1、fn2和fn3一开始一定会被存放在某个地方，当某种条件发生时，它们才会被一次性执行。

如果你使用vue的话，vue里的watch也是一样的道理：**先把某个函数或者某些函数注册存放到一个地方，当某个状态发生改变时，就把这些存放起来的函数一次性全部执行掉。**

**Promise里的then也是这样做的。当Promise处理异步时，then方法先执行，把作为参数的两个函数分别注册存放在实例中。等到resolve或者reject函数调用的时候再把它们执行掉。**

此时，then方法和resolve和reject的第三项功能也呼之欲出了。

- 首先，在构造函数里定义两个数组resolvedCallbacks和rejectedCallbacks，用来存放then方法传递进来的两个函数
- then方法接收两个参数，一个是成功的回调，一个是失败的回调，分别命名onResolved和onRejected
- then执行时，将onResolved函数push到定义好的resolvedCallbacks里，onRejected函数push到定义好的rejectedCallbacks里
- 当resolve执行时，除了之前的功能，还需要把resolvedCallbacks里存放的函数全部执行掉，在执行时把`this.data`的值传给它们；reject也是如此

```javascript
function MyPromise(executor) {
  this.status = 'pending'
  this.data = undefined
  this.reason = undefined
  this.resolvedCallbacks = [] // 存储then方法传递进来的第一个参数，成功的回调
  this.rejectedCallbacks = [] // 存储then方法传递进来的第二个参数，失败的回调
  
  let resolve = (value) => {
    if (this.status === 'pending') { 
      this.status = 'fulfilled'
      this.data = value
      // 将成功的回调全部执行，并且将this.data传递过去
      this.resolvedCallbacks.forEach(fn => fn(this.data))
    }
  }
  let reject = (reason) => {
    if (this.status === 'pending') {
      this.status = 'rejected'
      this.reason = reason
      // 将失败的回调全部执行，并且将this.reason传递过去
      this.rejectedCallbacks.forEach(fn => fn(this.reason))
    }
  }
  executor(resolve, reject)
}
// then方法接收到参数，分别命名onResolved和onRejected
MyPromise.prototype.then = function(onResolved, onRejected) { 
  this.resolvedCallbacks.push(onResolved) // 将onResolved存起来
  this.rejectedCallbacks.push(onRejected) // 将onRejected存起来
}
```

**请注意，以上的代码都是基于处理异步代码，也就是then方法会早于resolve或者reject执行。** 所以then里还需要做一步判断，即当前promise为pending状态时，再把回调push存放到相应的地方。

```javascript
function MyPromise(executor) {
  this.status = 'pending'
  this.data = undefined
  this.reason = undefined
  this.resolvedCallbacks = []
  this.rejectedCallbacks = []
  
  let resolve = (value) => {
    if (this.status === 'pending') { 
      this.status = 'fulfilled'
      this.data = value
      this.resolvedCallbacks.forEach(fn => fn(this.data))
    }
  }
  let reject = (reason) => {
    if (this.status === 'pending') {
      this.status = 'rejected'
      this.reason = reason
      this.rejectedCallbacks.forEach(fn => fn(this.reason))
    }
  }
  executor(resolve, reject)
}

MyPromise.prototype.then = function(onResolved, onRejected) {
  // 判断状态，只有当pending时才执行
  if (this.status === 'pending') {
    this.resolvedCallbacks.push(onResolved)
    this.rejectedCallbacks.push(onRejected)
  }
}
```

看到这一步，你可能会有点疑问，为啥用来存放then方法传递的函数要用数组？因为Promise可以像下面这样用哦

```javascript
let promise = new Promise(function(resolve, reject){
  setTimeout(() => {
    resolve(1)
  }, 1000)
})

promise.then(function(res) {
  console.log('处理res')
})

promise.then(function(res) {
  console.log('再来一次')
})
```

这个例子在同一个Promise实例上then了两次，注册了两次函数。当resolve执行的时候，会把then注册的两个函数都执行掉。

还有，你可能问，现在我们的Promise都是处理异步的情况，如果是**同步的情况怎么办呢？** 嗯，这个就是接下来要说的。

### 七、处理同步的情况

我们通常使用Promise是用来处理异步的情况，我们的MyPromise写到现在也都是基于处理异步这个前提。实际上，Promise也是可以处理同步状况的，而且非常简单。

如果你还记得前面有关Promise执行序列讲解的话，应该还记得，**异步时then方法是先于resolve或者reject执行的，而同步时then方法是在resolve或者reject之后执行的。** 请看下面的例子：

```javascript
let promise = new Promise(function(resolve, reject){
  resolve('success')
})

promise.then(function(res) {
  console.log(res)
})
```

上面的例子中，**在构造时resolve就已经调用，状态就已经确定，此时then晚执行，所以then此时只需要根据已经确定的状态直接调用成功或者失败的回调就完事了，不必再注册存放了。**

MyPromise进行如下更改：

```javascript
function MyPromise(executor) {
  this.status = 'pending'
  this.data = undefined
  this.reason = undefined
  this.resolvedCallbacks = []
  this.rejectedCallbacks = []
  
  let resolve = (value) => {
    if (this.status === 'pending') { 
      this.status = 'fulfilled'
      this.data = value
      this.resolvedCallbacks.forEach(fn => fn(this.data))
    }
  }
  let reject = (reason) => {
    if (this.status === 'pending') {
      this.status = 'rejected'
      this.reason = reason
      this.rejectedCallbacks.forEach(fn => fn(this.reason))
    }
  }
  executor(resolve, reject)
}

MyPromise.prototype.then = function(onResolved, onRejected) {
  if (this.status === 'pending') {
    this.resolvedCallbacks.push(onResolved)
    this.rejectedCallbacks.push(onRejected)
  }
  // 如果是成功状态直接成功的回调函数
  if (this.status === 'fulfilled') {
    onResolved(this.data)
  }
  // 如果是失败状态直接调失败的回调函数
  if (this.status === 'rejected') {
    onRejected(this.reason)
  }
}
```

我们可以测试一下哦~

```javascript
let promise = new MyPromise(function(resolve, reject) {
  setTimeout(() => {
    let flag = Math.random() > 0.5 ? true : false
    if (flag) {
      resolve('success')
    } else {
      reject('fail')
    }
  }, 1000)
})
promise.then(res => {
  console.log(res)
}, error => {
  console.log(error)
})
```



到这里，MyPromise的雏形完成了！嗯，只是一个雏形，它最核心的then方法我们几乎还没怎么实现。但是，如果你能完全看懂这四十几行的代码，那表示你已经离成功不远了！

接下来的一篇，我们需要完成最最核心的then方法的实现了！请看下一篇[包教包会，带你实现一个Promise]([https://github.com/anotherLee/Zoro/blob/master/notes/%E5%8C%85%E6%95%99%E5%8C%85%E4%BC%9A%EF%BC%8C%E5%92%8C%E4%BD%A0%E5%AE%9E%E7%8E%B0%E4%B8%80%E4%B8%AAPromise%EF%BC%88%E4%BA%8C%EF%BC%89.md](https://github.com/anotherLee/Zoro/blob/master/notes/包教包会，和你实现一个Promise（二）.md))

























