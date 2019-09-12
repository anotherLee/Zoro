### 一、承上

本篇文章是《包教包会，和你实现一个Promise》的第二篇，紧接着第一篇的内容。所以，如果你还没有看过第一篇，你可能需要看一下[包教包会，和你实现一个Promise（一）](https://github.com/anotherLee/Zoro/blob/master/notes/包教包会，和你实现一个Promise(一).md)。

第一篇我们已经实现了一个形式上非常类似Promise的MyPromise，但是尽管使用形式有点像，它离完全符合Promise A+规范的Promise还差的远。现在的MyPromise：

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
  let promise2
  if (this.status === 'pending') {
    this.resolvedCallbacks.push(onResolved)
    this.rejectedCallbacks.push(onRejected)
  }
  if (this.status === 'fulfilled') {
    onResolved(this.data)
  }
  if (this.status === 'rejected') {
    onRejected(this.reason)
  }
}
```

现在这个MyPromise的问题在于，它无法进行链式调用。我们在使用Promise的时候，会有这样的代码：

```javascript
let promise1 = new Promise(function(resolve, reject) {
  // 模拟异步
  setTimeout(() => {
    let flag = Math.random() > 0.5 ? true : false
    if (flag) {
      resolve('success')
    } else {
      reject('fail')
    }
  }, 1000)
})

promise1.then(res => {
  return 1
}, err => {
  return err
}).then(res => {
  console.log(res)
})
```

但是目前MyPromise的then是一次性，执行完了就完了，没有返回能then的东西。

### 二、链式调用

**根据Promise A+规范，一个Promise实例在then之后一定会返回一个新的Promise实例，这样就可以使用then来实现链式调用了。** 

在实现then方法之前，我们先简单聊一下实现链式调用的技巧。一般来说，实现链式调用有两个方法：

- 当某个方法执行时，返回自身，也就是返回this，比如jQuery就是这样做的
- 另一种，就是Promise这样，当then方法执行时，返回一个新的Promise实例

#### 1、jQuery的链式调用思路

```javascript
function $(selector) {
  return new jQuery(selector) 
}

class jQuery {
  constructor(selector) {
    let slice = Array.prototype.slice
    this.domArray = slice.call(document.querySelectorAll(selector))
    // ...
  }
  append() {
    // ...
    return this
  }
  addClass() {
    //..
    return this
  }
}
```

上面代码思路：先构造一个jQuery对象，它的某些方法在执行完了之后返回this，也就是这个一开始构造的jQuery对象。这样，就可以这样链式调用下去：`$('.app').append($span).addClass('test')`



#### 2、promise链式调用的思路

```javascript
class Promise {
  constructor() {
    //...
  }
  then() {
    //...
    let promise2 = new Promise()  // 重点在这
    return promise2
  }
}

// 使用
let promise1 = new Promise()
let promise2 = promise1.then()
let promise3 = promise2.then()
// 也可以直接写成这样
promise1.then().then()
```

**这样，每次then方法执行的时候，都会返回一个完全新的Promise实例，就可以继续往下then了。**



### 三、then方法的功能

到这里，我们终于来到了Promise最核心部分，那就是then方法。在整个Promise A+规范里，大部分内容都在说then是如何实现的，说then方法是Promise的核心一点问题都没有。

我们先明确then方法的功能：

- then方法必须返回一个新的Promise实例，这样才能进行链式回调，这个上面说过
- **then方法返回的新的Promise实例的状态依赖于当前实例的状态和回调返回值的状态**
- **当前Promise状态确定后的回调返回值可以被新的实例拿到**

接下来分开解释。

第一点，实现链式调用的方法，上面讲过了，不再赘述。

第二点，then方法返回的新Promise实例状态依赖于当前实例状态和回调返回值的状态。要理解这句话，请仔细看下面的例子：

```javascript
let promise1 = new Promise(function(resolve, reject) {
  setTimeout(() => {
    resolve('success')
  }, 1000)
})

let promise2 = promise1.then(res => {
  return res
})

console.log(promise1) // pendding状态
console.log(promise2) // pending状态

setTimeout(() => {
  console.log(promise1) // 成功状态
  console.log(promise2) // 成功状态
}, 1000)
```

从上面的代码可以看出：如果promise1是pending状态，那promise2也一定是pending状态。只有当promise1状态确定，**promise2的状态才有可能确定。** 那当promise1状态确定的时候，是不是promise2的状态就确定了呢？**也不是，还要看promise1的then里注册的两个函数的返回值。** 请看下面的例子：

``` javascript
let promise1 = new Promise(function(resolve, reject) {
  setTimeout(() => {
    resolve('success')
  }, 1000)
})

let promise2 = promise1.then(res => {
  return Promise.reject('拒绝') // 注意这里，这个回调返回了一个拒绝状态Promise哦
})

console.log(promise1) // pending状态
console.log(promise2) // pending状态

setTimeout(() => {
  console.log(promise1) // 成功状态
  console.log(promise2) // 这里是失败状态
}, 1000)
```

从上面的两个例子，我们可以得到以下结论：**当我们在then方法里构造新的Promise时，我们不仅要根据当前Promise实例的状态使用不同的策略，同时还要考虑当前then方法传递的两个回调的结果。**

第三点，其实很好理解，当promise1的then方法里传递的回调执行的结果，可以被下个实例拿到，这里很简单，获得回调的结果，**再根据条件resolve或者reject传进去即可。**

以上的内容，如果听不懂没关系，下面讲then方法具体实现的时候还会再说道。



### 四、then方法的具体实现

then方法需要返回一个新的Promise实例，**而且需要根据当前实例的状态来构造这个新的实例**。所以MyPromise的then方法的代码改成如下的样子：

```javascript
MyPromise.prototype.then = function(onResolved, onRejected) {
  let promise2

  if (this.status === 'pending') {
    promise2 = new MyPromise((resolve, reject) => {

    })
    // this.resolvedCallbacks.push(onResolved)
    // this.rejectedCallbacks.push(onRejected)
  }

  if (this.status === 'fulfilled') {
    promise2 = new MyPromise((resolve, reject) => {

    })
    // onResolved(this.data)
  }

  if (this.status === 'rejected') {
    promise2 = new Promise((resolve, reject) => {

    })
    // onRejected(this.reason)
  }
  
  return promise2
}
```

声明一个需要返回的promise2，然后根据当前当前实例的状态来给它赋值。在这里，我们先注释了每个if判断里原来的代码。**接下来的重点就是构造promise2，看它的executor函数具体如何实现了。** 我们先开讨论。

#### 1. 当前实例状态为pending时

根据之前的讨论，当前为pending时，需要等到它确定时，promise2的状态才有可能确定。所以MyPromise里这部分代码这样写

```javascript
MyPromise.prototype.then = function(onResolved, onRejected) {
  let promise2

  if (this.status === 'pending') {
    promise2 = new MyPromise((resolve, reject) => {
      // 声明一个成功函数
      function successFn(value) {
        let x = onResolved(value)   
      }
      // 声明一个失败函数
      function failFn(reason) {
        let x = onRejected(reason) 
      }
      // 将成功函数push到当前实例的resolvedCallbacks
      this.resolvedCallbacks.push(successFn)
      // 将失败函数push到当前实例的rejectedCallbacks
      this.rejectedCallbacks.push(failFn)
    })
  }

  if (this.status === 'fulfilled') {
    promise2 = new MyPromise((resolve, reject) => {

    })
    // onResolved(this.data)
  }

  if (this.status === 'rejected') {
    promise2 = new Promise((resolve, reject) => {

    })
    // onRejected(this.reason)
  }
  
  return promise2
}
```

解释一下上面代码的意思：如果当前Promise的then调用时状态为pending时，我们声明successFn和failFn，并且把它们分别push到resolvedCallbacks和rejectedCallbacks里。**这样，successFn和failFn的执行时机就交给了当前promise实例。当当前Promise实例状态确定时，successFn或者failFn就会被执行，这样就可以通过调用onResovled或者onRejected拿到回调的结果了。**

**这一步非常关键，如果当前Promise实例状态为pending时，then方法里返回新的promise2就必须等到它状态确定时才能拿到它成功或者失败回调的值。然后根据回调执行后的结果x来确定promise2的状态。**

整个流程的顺序如下：

- 当前实例处理异步代码，状态为pending
- then方法执行，当前实例状态仍为pending，走到`if(this.status === 'pending')`分支里
- 构造并返回一个promise2，promise2里此时状态为pending
- promise2的executor声明successFn和failFn当push当前实例的resolvedCallbacks和rejectedCallbacks里
- 当前实例的resolve或者reject调用，状态确定，存放在resolvedCallbacks里的successFn或者failFn被执行
- 当前实例then方法提供的onResovled或者onRejected被执行，拿到当前实例resolve或者reject传过来的值并处理返回x
- 针对x进行处理。。。



#### 2. 当前实例状态为`fulfilled`或者`rejected`

这个简单，直接调用onResovled或者onRejected，也就是当前实例then传递的第一个和第二个参数。

```javascript
MyPromise.prototype.then = function(onResolved, onRejected) {
  let promise2

  if (this.status === 'pending') {
    promise2 = new MyPromise((resolve, reject) => {
      function successFn(value) {
        let x = onResolved(value)   
      }
      function failFn(reason) {
        let x = onRejected(reason) 
      }
      this.resolvedCallbacks.push(successFn)
      this.rejectedCallbacks.push(failFn)
    })
  }

  if (this.status === 'fulfilled') {
    promise2 = new MyPromise((resolve, reject) => {
      // 因为此时当前实例的resolve或者reject已经执行
      // this.data或者this.reason
      let x = onResolved(this.data)
    })
  }

  if (this.status === 'rejected') {
    promise2 = new MyPromise((resolve, reject) => {
      // 此时当前实例resolve或者reject已经执行
      let x = onRejected(this.reason)
    })
  }
  
  return promise2
}
```

此时，当前实例的resolve或者reject已经执行，状态已经确定，this.data或者this.reason已经有值，直接用then传递的onResoved或者onRjected调用即可获取x。

我们的then写到这里，promise2它已经拿到了当前实例的回调结果了。**我们看一下实际使用中它在哪里** 。请看下面的例子：

```javascript
let promise1 = new Promise(function(resolve, reject) {
  setTimeout(() => {
    resolve('success')
  }, 1000)
})

function onResolved(res) {
  // 这里进行处理
  return xxx // 这里返回的xxx其实就是上面代码里的x
}

function onRejected(err) {
  // 处理
  return xxx // 这里返回的xxx就是上面代码里的x
}
let promise2 = promise1.then(onResolved, onRjected)
```

**到这里，当then方法执行时，我们已经成功拿到了当前实例的回调值x，接下来，我们将对这个值进行统一处理，并根据x来调用promise2的构造时的resolve或者reject方法来确定promise2的状态。**

#### 3、处理x

在规范里，关于如何处理x来确定promise2的状态有一个专门的章节来论述。它在规范的2.3节，称为[The Promise Resolution Procedure](https://promisesaplus.com/) ，它根据x的可能的值进行针对处理。x可以是以下的值：

- x就是promise2实例本身，后面解释
- x是我们自己写的MyPromise实例
- x是函数或者对象时
- x不是函数或者对象时

我们需要写一个函数`resolve_promise` 来对x进行处理，并确定promise2的状态

```javascript
MyPromise.prototype.then = function(onResolved, onRejected) {
  let promise2

  if (this.status === 'pending') {
    promise2 = new MyPromise((resolve, reject) => {
      function successFn(value) {
        let x = onResolved(value)
        // 注意这里
        resolve_promise(promise2, x, resolve, reject)
      }
      function failFn(reason) {
        let x = onRejected(reason)
        // 这里也有
        resolve_promise(promise2, x, resolve, reject)
      }
      this.resolvedCallbacks.push(successFn)
      this.rejectedCallbacks.push(failFn)
    })
  }

  if (this.status === 'fulfilled') {
    promise2 = new MyPromise((resolve, reject) => {
      let x = onResolved(this.data)
      // 这里也有哦
      resolve_promise(promise2, x, resolve, reject)
    })
  }

  if (this.status === 'rejected') {
    promise2 = new Promise((resolve, reject) => {
      // 还有这里哦
      let x = onRejected(this.reason)
      resolve_promise(promise2, x, resolve, reject)
    })
  }
  
  return promise2
}
// 这里是resolve_promise
function resolve_promise(promise2, x, resolve, reject) {
  
}
```

要写的resolve_promise接收4个参数，一个是当前正在构造的promise2实例，一个是通过当前回调拿到的结果x，**resolve和reject是用来确定promise2状态的两个方法，因为只有resolve或者reject被调用了，promise2的状态才能确定嘛 。**

接下来，我们根据x可能的四种状态，来分别处理，这些都是规范的具体内容：

##### 3.1 如果x是promise2实例本身

这种情况只有在当前实例是pending状况下才有可能发生，例子如下：

```javascript
let promise1 = new Promise(function(resolve, reject) {
  setTimeout(() => {
    resolve('success')
  }, 1000)
})

function onResolved(res) {
  return promise2
}
let promise2 = promise1.then(onResolved)

promise2.then(res => {
  console.log(res)
}, err => {
  console.log(err) 
  // 这里会打印出 TypeError: Chaining cycle detected for promise
})
```

所以当这种情况发生时，根据规范，直接把promise2使用reject拒绝，并传一个TypeError

```javascript
function resolve_promise(promise2, x, resolve, reject) {
  if (x === promise2) {
    reject(new TypeError('Chaining cycle detected for promise'))
    return //这里return不用再往下了
  }
}
```

##### 3.2 如果x是我们自己写的MyPromise实例

使用场景是这种情况：

```javascript
let promise1 = new Promise(function(resolve, reject) {
  setTimeout(() => {
    resolve('success')
  }, 1000)
})

function onResolved(res) {
  // 这里返回的promise就是我们要处理的x
  return new Promise(function(resolve, reject) {
    reject('fail')
  })
}
let promise2 = promise1.then(onResolved)
```

这个时候根据规范，promise2的状态和值使用x的状态和值，分三种情况：

- 如果x是pending状态，我们的promise2必须等到x状态变为成功或者失败，在此之前都是pending
- 如果x是fulfilled也就是成功状态，将promise2也标记为成功状态，传递的值也是x里成功的值
- 如果x是rejected也就是失败状态，把Promise2票房为失败状态，传递的值也是x里失败的值

此时的resolve_promise方法进行如下更改：

```javascript
function resolve_promise(promise2, x, resolve, reject) {
  // x和promise2引用相同的情况
  if (x === promise2) {
    reject(new TypeError('Chaining cycle detected for promise'))
    return
  }
  // 如果x是MyPromise的实例
  if (x instanceof MyPromise) {
    x.then(function (v) {
      resolve_promise(promise2, v, resolve, reject)
    }, function (t) {
      reject(t)
    }
    return
  }
}
```

这里你可能看不懂，不是说有三种情况吗？这个代码也没有针对这三种情况做判断呀。**是这样的，规范上说的三种情况我通过一个`x.then`就可以拿到x构造时resolve或者reject函数传递的值。这里真正的坑点在于，x在构造时使用resolve或者reject传值时也可能传递了一个promise实例，而且还是规范其它实现（比如bluebird或者Q）的promise实例，所以这里才需要使用递归。这个坑点在规范里没说，但是如果不这样写，有很多测试用例通不过。** 

##### 3.3 如果x是一个函数或者对象

根据规范：

- 先取`let then = x.then`，如果在这个过程出现抛出了异常，就`reject(e)`
- 接上，如果我们上一步赋值的`then`是一个函数
  - 使用call调用它，把x作为this传给then，它的第一个参数为resolvePromise，第二个参数为rejectPromise
    - 如果resolvePromise被调用时传递了参数y，则递归调用resolve_promise
    - 如果rejectPromise被调用时传递了参数r，`reject(r)`
    - resolvePromise和rejectPromise如果都被调用了，先调用的那个作数，后面调用的那个被忽略
  - 如果用call调用then时出现了异常
    - 如果此时resolvePromise或者rejectPromise都被调用了，忽略这个异常
    - 如果没有，reject这个异常
- 如果第一步赋值的then不是一个函数，直接`resolve(x)`

**你可能看不懂规范上说的这些空间是干嘛的，其实它是对Promise实现方案做的一个兼容处理。我们知道，Promise并没有官方实现，只有规范和测试用例，它有多种实现，比如bluebird和Q，如果我在使用时，同时用了bluebird和Q，就需要做兼容处理。**

**这里的x就可能是bluebird或者Q的实例。**

那我如何判断它是其它Promise的实现呢？**看它有没有一个then方法，所有Promise实现都有合乎规定的then方法。如果有then就会走到这里的逻辑。如果x是一个包含then方法的普通对象，也会走到这里。所以这里才会有这么多的判断，还有递归。** 

直接写MyPromise：

```javascript
function resolve_promise(promise2, x, resolve, reject) {
  // x就是promise2的情况
  if (x === promise2) {
    reject(new TypeError('Chaining cycle detected for promise'))
    return
  }
  // x是MyPromise实例的情况
  if (x instanceof MyPromise) {
    x.then(function(v) {
      resolve_promise(promise2, v, resolve, reject)
    }, function(t) {
      reject(t)
    })
    return
  }
  // x 是对象或者函数
  if (x !== null && (typeof x === 'function' || typeof x === 'object')) {
    // 开关
    // 控制resolvePromise和rejectPromise还有catch里reject的调用
    let called = false
    try { // x.then可能有异常，需要捕获
      let then = x.then
      if (typeof then === 'function') {
        // 有then方法，则调用，如果then方法并没有实际resolvePromise
        // 或者rejectPromise参数的话，promise2永远都是pending状态
        // 因为resolve和reject永远都不可能执行
        then.call(x, function resolvePromise(y) {
          if (called) return
          called = true
          resolve_promise(promise2, y, resolve, reject)
        }, function rejectPromise(r) {
          if (called) return
          called = true
          reject(r) 
        })
      } else {
        // 如果then不是一个函数直接resolve
        resolve(x)
      }
    } catch (e) {
      if (called) return
      called = true
      reject(e)
    }
  } else {
    resolve(x)
  }
}
```

看到这里，你就可以找出Promise的一个"bug"了，请看下面场景的代码：

```javascript
let promise1 = new Promise(function(resolve, reject) {
  setTimeout(() => {
    resolve('success')
  }, 1000)
})
let promise2 = promise1.then(function(res) {
  // 这里返回一个包括then方法的对象
  // 但是这个then方法啥都没做
  // 导致promise2在构造过程中resolve或者reject永远都没执行
  return { 
    then: function() {} 
  }
})
promise2.then(res => {
  // 这里永远都不会执行
  console.log(res)
})
// promise2永远都是pending状态
console.log(promise2)
```

你可以把上面的代码粘到浏览器里试一下~



##### 3.4 如果x不是一个函数或者对象

那直接`resolve(x)`即可，在上面已经有了。



### 五、改个错误

请看我们已经写的then函数里：

```javascript
MyPromise.prototype.then = function (onResolved, onRejected) {
  let promise2
  if (this.status === 'pending') {
    promise2 = new MyPromise((resolve, reject) => {
      function successFn(value) {
        let x = onResolved(value)
        resolve_promise(promise2, x, resolve, reject)
      }

      function failFn(reason) {
        let x = onRejected(reason)
        resolve_promise(promise2, x, resolve, reject)
      }

      this.resolvedCallbacks.push(successFn)
      this.rejectedCallbacks.push(failFn)
    })
  }

  if (this.status === 'fulfilled') {
    promise2 = new MyPromise((resolve, reject) => {
      let x = onResolved(this.data)
      // 看这里，看下面这行
      resolve_promise(promise2, x, resolve, reject)
    })
  }

  if (this.status === 'rejected') {
    promise2 = new Promise((resolve, reject) => {
      let x = onRejected(this.reason)
      // 看这里，看下面这行
      resolve_promise(promise2, x, resolve, reject)
    })
  }

  return promise2
}
```

在`this.status === 'fulfilled'`和`this.status === 'rejected'`这两个分支里执行`resolve_promise`是拿不到promise2这个实例的，**因为它没还构造完成，是undefined** ，所以这里要加个setTimeout才行。**而且，根据规范，onResolved和onRejected必须异步执行呢。**

注意，`this.stauts === 'pending'`的那个不用哦，因为它执行的时候就是异步的。

改成下面这样：

```javascript
if (this.status === 'fulfilled') {
  promise2 = new MyPromise((resolve, reject) => {
    setTimeout(() => {
      let x = onResolved(this.data)
      resolve_promise(promise2, x, resolve, reject)
    })
  })
}

if (this.status === 'rejected') {
  promise2 = new Promise((resolve, reject) => {
    setTimeout(() => {
      let x = onRejected(this.reason)
      resolve_promise(promise2, x, resolve, reject)
    })
  })
}
```



### 六、总结

其实，现在我们已经基本写出一个Promise了！但是你可以会问，`Promise.all` `Promise.race` 实例上的`catch` 等方法现在还没有啊！不用担心，只要完成了then，一个Promise就完成了百分之八十了，以上常的的几个API都是小意思，要实现分分钟~ 当然，它还有点小瑕疵，这些问题，还有测试，我们下篇文章完成！

完成的代码在这里：

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

MyPromise.prototype.then = function (onResolved, onRejected) {
  let promise2

  if (this.status === 'pending') {
    promise2 = new MyPromise((resolve, reject) => {
      function successFn(value) {
        let x = onResolved(value)
        resolve_promise(promise2, x, resolve, reject)
      }

      function failFn(reason) {
        let x = onRejected(reason)
        resolve_promise(promise2, x, resolve, reject)
      }

      this.resolvedCallbacks.push(successFn)
      this.rejectedCallbacks.push(failFn)
    })
  }

  if (this.status === 'fulfilled') {
    promise2 = new MyPromise((resolve, reject) => {
      setTimeout(() => {
        let x = onResolved(this.data)
        resolve_promise(promise2, x, resolve, reject)
      })
    })
  }

  if (this.status === 'rejected') {
    promise2 = new Promise((resolve, reject) => {
      setTimeout(() => {
        let x = onRejected(this.reason)
        resolve_promise(promise2, x, resolve, reject)
      })
    })
  }

  return promise2
}

function resolve_promise(promise2, x, resolve, reject) {
  if (x === promise2) {
    reject(new TypeError('Chaining cycle detected for promise'))
    return
  }
  if (x instanceof MyPromise) {
    x.then(function(v) {
      resolve_promise(promise2, v, resolve, reject)
    }, function(t) {
      reject(t)
    })
    return
  }
  if (x !== null && (typeof x === 'function' || typeof x === 'object')) {
    let called = false
    try {
      let then = x.then
      if (typeof then === 'function') {
        then.call(x, function resolvePromise(y) {
          if (called) return
          called = true
          resolve_promise(promise2, y, resolve, reject)
        }, function rejectPromise(r) {
          if (called) return
          called = true
          reject(r)
        })
      } else {
        resolve(x)
      }
    } catch (e) {
      if (called) return
      called = true
      reject(e)
    }
  } else {
    resolve(x)
  }
}

```



感谢您的阅读！









