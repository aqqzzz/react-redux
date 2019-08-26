import { getBatch } from './batch'

// encapsulates the subscription logic for connecting a component to the redux store, as
// well as nesting subscriptions of descendant components, so that we can ensure the
// ancestor components re-render before descendants
// 封装 connect component 和嵌套的子孙组件 到 redux store 的观察者注册与解绑逻辑
// 以保证祖先组件在后代组件之前 重新渲染
const CLEARED = null
const nullListeners = { notify() {} }

// 观察者函数集合
function createListenerCollection() {
  const batch = getBatch()
  // the current/next pattern is copied from redux's createStore code.
  // TODO: refactor+expose that code to be reusable here?
  let current = []
  let next = []

  return {
    // 清空观察者
    clear() {
      next = CLEARED
      current = CLEARED
    },

    // 通知观察者
    notify() {
      const listeners = (current = next)
      batch(() => {
        for (let i = 0; i < listeners.length; i++) {
          listeners[i]()
        }
      })
    },

    // 获取观察者列表
    get() {
      return next
    },

    // 注册观察者
    subscribe(listener) {
      let isSubscribed = true
      if (next === current) next = current.slice()
      next.push(listener)

      // 返回一个解注册当前观察者的方法
      return function unsubscribe() {
        if (!isSubscribed || current === CLEARED) return
        isSubscribed = false

        if (next === current) next = current.slice()
        next.splice(next.indexOf(listener), 1)
      }
    }
  }
}

export default class Subscription {
  constructor(store, parentSub) {
    this.store = store
    this.parentSub = parentSub
    this.unsubscribe = null // ??
    this.listeners = nullListeners // 观察者集合，非数组，而是几个函数的集合

    this.handleChangeWrapper = this.handleChangeWrapper.bind(this)
  }

  // 添加一个观察者
  addNestedSub(listener) {
    this.trySubscribe() // 添加第一个观察者的时候生成观察者列表
    return this.listeners.subscribe(listener)
  }

  // 通知观察者
  notifyNestedSubs() {
    this.listeners.notify()
  }

  // onStateChange：通过 instance.onStateChange 定义，
  // 在 Provider 中，onStateChange 指向的调用方法为 subscription.notifyNestedSubs
  // TODO 为什么要把这个逻辑包在Provider中，反正肯定是调用Subscription自身的方法
  handleChangeWrapper() {
    if (this.onStateChange) {
      this.onStateChange()
    }
  }

  // 是否已被注册过了
  isSubscribed() {
    return Boolean(this.unsubscribe)
  }

  trySubscribe() {
    // 初次注册，如果存在parentSub，则将 handleChangeWrapper 注册到 parentSub 中去，否则注册到当前组件对应的store中去
    // 也就是把 notify 当前组件的方法，作为 观察者注册到 parent Subscription 上，添加到 parentSubscription 的 观察者列表里
    // 保证了在父组件更新时，先调用父组件的观察者方法，再调用子组件的观察者方法
    if (!this.unsubscribe) {
      this.unsubscribe = this.parentSub
        ? this.parentSub.addNestedSub(this.handleChangeWrapper)
        : this.store.subscribe(this.handleChangeWrapper)

      // 生成观察者集合
      this.listeners = createListenerCollection()
    }
  }

  // 解注册
  tryUnsubscribe() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
      this.listeners.clear()
      this.listeners = nullListeners
    }
  }
}
