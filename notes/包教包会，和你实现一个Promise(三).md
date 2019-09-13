### 一、承上

本篇文章是包教包会，和你实现一个Promise的第三篇文章。因为这个小系列旨在完成一个符合规范的Promise，而且这三篇文章有前后关系，如果没有看过前两篇，第三篇看起来会有些莫名其妙。要是没看过，还是建议先看下前两篇。在这里：

[包教包会，和你实现一个Promise(一)]([https://github.com/anotherLee/Zoro/blob/master/notes/%E5%8C%85%E6%95%99%E5%8C%85%E4%BC%9A%EF%BC%8C%E5%92%8C%E4%BD%A0%E5%AE%9E%E7%8E%B0%E4%B8%80%E4%B8%AAPromise(%E4%B8%80).md](https://github.com/anotherLee/Zoro/blob/master/notes/包教包会，和你实现一个Promise(一).md) 

[包教包会，和你实现一个Promise(二)]([https://github.com/anotherLee/Zoro/blob/master/notes/%E5%8C%85%E6%95%99%E5%8C%85%E4%BC%9A%EF%BC%8C%E5%92%8C%E4%BD%A0%E5%AE%9E%E7%8E%B0%E4%B8%80%E4%B8%AAPromise(%E4%BA%8C).md](https://github.com/anotherLee/Zoro/blob/master/notes/包教包会，和你实现一个Promise(二).md) 

到目前为止，我们的MyPromise虽然可以用了，但是还有一些地方不符合规范，再就是有些地方还有点问题，我们来进行逐个修改。



### 二、then方法完善

#### 2.1 给参数设置默认值

现在then方法的两个参数是没有默认值的，所以如果使用者在调用then方法时，没有传递参数，后面我们使用onResolved或者onRejected时，程序会报`onResolved/onRejected is not a function`，这会导致我们的Promise被迫终止，所以要给它们加上默认值。

``` javascript
MyPromise.prototype.then = function (onResolved, onRejected) {
  // 看这里，设置onResovled的默认值
  if (typeof onResolved !== 'function') {
    onResolved = function(value) {
      return value
    }
  }
  // 看这里，设置onRejected的默认值
  if (typeof onRejected !== 'function') {
    onRejected = function(reason) {
      throw reason
    }
  }

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
    promise2 = new MyPromise((resolve, reject) => {
      setTimeout(() => {
        let x = onRejected(this.reason)
        resolve_promise(promise2, x, resolve, reject)
      })
    })
  }

  return promise2
}
```

上面通过tyepof判断onResovled或者onRejected是不是function类型，如果不是，就给一个函数。这样，不仅避免了不传值的情况，也解决了使用随便乱传参数的问题。

**对于onResolved的方法，我们声明一个函数直接返回value即可，对于onRejected的方法，我们抛一个错误出来。这样promise2也就可以通过then方法拿到它们返回或者抛出的错误的。** 

#### 2.2 onResolved/onRejected的执行问题 

我们来看这里的代码，这里只是其中一处：

```javascript
if (this.status === 'fulfilled') {
  promise2 = new MyPromise((resolve, reject) => {
    setTimeout(() => {
      // 看这里看这里
      let x = onResolved(this.data)
      resolve_promise(promise2, x, resolve, reject)
    })
  })
}
```

我们知道，then方法执行时，用户会写两个函数onResovled和onRejected并且传进来，然后我们调用它们来获得当前Promise实例resolve或者reject传递过来的值。**但是问题来了，因为onResovled和onRejected是用户实现、我们调用的，那用户写onResolved或者onRejected时写错了，里面语法有问题，执行的时候报错了，那我们的程序也会终止掉。所以我们要针对这种可能性做一个try...catch捕捉。**

总共有四个地方需要try...catch：

```javascript
MyPromise.prototype.then = function (onResolved, onRejected) {
  if (typeof onResolved !== 'function') {
    onResolved = function(value) {
      return value
    }
  }
  if (typeof onRejected !== 'function') {
    onRejected = function(reason) {
      throw reason
    }
  }
  let promise2

  if (this.status === 'pending') {
    promise2 = new MyPromise((resolve, reject) => {
      function successFn(value) {
        // 这里要try...catch
        try {
          let x = onResolved(value)
          resolve_promise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      }

      function failFn(reason) {
        // 这里要try...catch
        try {
          let x = onRejected(reason)
          resolve_promise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      }

      this.resolvedCallbacks.push(successFn)
      this.rejectedCallbacks.push(failFn)
    })
  }

  if (this.status === 'fulfilled') {
    promise2 = new MyPromise((resolve, reject) => {
      setTimeout(() => {
        // 这里也要哦
        try {
          let x = onResolved(this.data)
          resolve_promise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  if (this.status === 'rejected') {
    promise2 = new MyPromise((resolve, reject) => {
      setTimeout(() => {
        // 这里也要哦
        try {
          let x = onRejected(this.reason)
          resolve_promise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  return promise2
}
```

总共四个地方，如果onResolved或者onRejected执行报错，会被catch到，并且直接用reject把promise2标记为失败状态。then方法改完了，下面构造函数也要小小改一下。



### 三、构造函数完善

构造函数有个地方要修改：**resolve和reject里的内容需要异步执行。** 为啥要这样写，其实我也不清楚，因为从逻辑上来看即使不写似乎也没毛病。但是不它们设置成异步执行的话，有6个测试用例通不过。 

所以我去看了它的测试用例，你也可以看看，地址在[这里](https://github.com/promises-aplus/promises-tests/blob/master/lib/tests/2.2.2.js) ：它是这么测的：

```javascript
specify("fulfilled after a delay", function (done) {
  var d = deferred();
  var isFulfilled = false;

  d.promise.then(function onFulfilled() {
    assert.strictEqual(isFulfilled, true);
    done();
  });

  setTimeout(function () {
    d.resolve(dummy);
    isFulfilled = true;
  }, 50);
});
```

**根据规范，我只要保证onResolved在resolve之后执行就行，所以现在写的代码没啥问题，但问题是它的测试用例，先声明了一个isFulfilled，然后使用setTimeout调用resolve并将isFulfilled置为true，并在onResolved判断一个isFulfilled为true。** 

**但是，我们是在resolve函数里面就已经调用resolve了，所以此时isFufilled还是false，所以我们需要给resolve和reject里的代码都异步执行才能通过这里的测试。** 

 

```javascript
function MyPromise(executor) {
  this.status = 'pending'
  this.data = undefined
  this.reason = undefined
  this.resolvedCallbacks = []
  this.rejectedCallbacks = []

  let resolve = (value) => {
    // 这里加个setTimeout
    setTimeout(() => {
      if (this.status === 'pending') {
        this.status = 'fulfilled'
        this.data = value
        this.resolvedCallbacks.forEach(fn => fn(this.data))
      }
    })
  }
  let reject = (reason) => {
    // 这里也加个setTimeout
    setTimeout(() => {
      if (this.status === 'pending') {
        this.status = 'rejected'
        this.reason = reason
        this.rejectedCallbacks.forEach(fn => fn(this.reason))
      }
    })
  }
  executor(resolve, reject)
}
```



### 四、测试

测试很简单，有专门的测试工具。

```
npm install -g promises-aplus-tests
```

同时还要将我们的MyPromise暴露出去，并提供promise实例和resolve以及reject函数引用。

```javascript
MyPromise.deferred = function() {
  let dfd = {}
  dfd.promise = new MyPromise(function(resolve, reject) {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}

try {
  module.exports = MyPromise
} catch (e) {}
```

我们需要在MyPromise上写一个静态方法，执行后返回一个dfd对象。这个对象上有三个属性：

- `promise`: 一个我们要测试的Promise实例
- `resolve`: 这个实例的resolve函数
- `reject`: 这个实例的reject函数



**好了，到这里看一下包括测试需要在内的所有的代码：**

```javascript
function MyPromise(executor) {
  this.status = 'pending'
  this.data = undefined
  this.reason = undefined
  this.resolvedCallbacks = []
  this.rejectedCallbacks = []

  let resolve = (value) => {
    setTimeout(() => {
      if (this.status === 'pending') {
        this.status = 'fulfilled'
        this.data = value
        this.resolvedCallbacks.forEach(fn => fn(this.data))
      }
    })
  }
  let reject = (reason) => {
    setTimeout(() => {
      if (this.status === 'pending') {
        this.status = 'rejected'
        this.reason = reason
        this.rejectedCallbacks.forEach(fn => fn(this.reason))
      }
    })
  }
  executor(resolve, reject)
}

MyPromise.prototype.then = function (onResolved, onRejected) {
  if (typeof onResolved !== 'function') {
    onResolved = function(value) {
      return value
    }
  }

  if (typeof onRejected !== 'function') {
    onRejected = function(reason) {
      throw reason
    }
  }

  let promise2

  if (this.status === 'pending') {
    promise2 = new MyPromise((resolve, reject) => {
      function successFn(value) {
        try {
          let x = onResolved(value)
          resolve_promise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      }

      function failFn(reason) {
        try {
          let x = onRejected(reason)
          resolve_promise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      }

      this.resolvedCallbacks.push(successFn)
      this.rejectedCallbacks.push(failFn)
    })
  }

  if (this.status === 'fulfilled') {
    promise2 = new MyPromise((resolve, reject) => {
      setTimeout(() => {
        try {
          let x = onResolved(this.data)
          resolve_promise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  if (this.status === 'rejected') {
    promise2 = new MyPromise((resolve, reject) => {
      setTimeout(() => {
        try {
          let x = onRejected(this.reason)
          resolve_promise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
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

MyPromise.deferred = function() {
  let dfd = {}
  dfd.promise = new MyPromise(function(resolve, reject) {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}

try {
  module.exports = MyPromise
} catch (e) {

}
```

开始测试：

```
promises-aplus-tests MyPromise.js
```

你将会看到：

![](/Users/limingru/Downloads/测试成功.jpg)



**872个测试用例全部通过！** 



### 五、锦上添花

接下来，我们实现一些非常常用的方法，这些方法虽然不在规范里，但是它们平时也有用武之地！

#### 5.1 MyPromise.all()

这个方法有以下特点：

- 参数：是一个MyPromise实例组成的数组
- 返回一个MyPromise实例，不过要等到所有的参数里所有的promise状态确定
- 参数的实例中，只要有一个是reject，返回的promise就是reject状态

```javascript
MyPromise.all = function(arr) {
  return new MyPromise(function(resolve, reject) {
    let result = []
    for(let i=0; i<result.length; ++i) {
      let currentPromise = result[i]
      currentPromise.then(function(res) {
        result.push(res)
        if (result.length === arr.length) {
          resolve(result)
        }
      }, function(reason) {
        reject(reason)
      })
    }
  }) 
}
```

很好理解，就不多讲了~



#### 5.2 catch()方法

注意，这个方法是实例方法：

- 接收一个函数作为参数
- 当then出现问题时会执行这个函数

```javascript
MyPromise.prototype.catch = function(failFn) {
  this.then(null, function(reason) {
    failFn(reason)
  })
}
```

不多说了



#### 5.3 race()方法

注意，这是一个静态方法：

- 接收一个promise实例构成的数组，返回一个MyPromise实例
- 当参数里的promise第一个状态确认时，把它作为成功或者失败的值返回一个新实例

```javascript
MyPromise.race = function(arr) {
  return new MyPromise(function(resolve, reject) {
    arr.forEach(promise => {
      promise.then(resolve, reject)
    })
  })
}
```

完事~



#### 5.4 MyPromise.resolve()

直接返回一个成功状态的Promise，静态方法：

```javascript
MyPromise.resolve = function(value) {
  return new MyPromise(function(resolve, reject) {
    resolve(value)
  })
}
```



#### 5.5 MyPromise.reject()

直接返回一个失败状态的Promise实例，静态方法：

```javascript
MyPromise.reject = function(reason) {
  return new MyPromise(function(resolve, reject) {
    reject(reason)
  })
}
```

**后面我们实现的这些方法是没有测试用例的哦~** 



### 六、起一个帅气的名字

好不容易完成了一个完全符合规范的Promise，给它起一个帅气的名字吧，就叫Zoro吧。Zoro是《海贼王》里罗罗诺亚·索隆的英文名字，**索隆在小时候曾经向古伊娜许诺要成为世界最强剑豪** ，而现在索隆刚拿到阎魔这把刀，在成为最强的道路上一路狂奔，所以我觉得这个名字再合适不过了！

![Zoro](/Users/limingru/Downloads/mid_89db8fb9b7a053d.jpg)







