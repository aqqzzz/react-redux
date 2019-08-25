import verifyPlainObject from '../utils/verifyPlainObject'

export function wrapMapToPropsConstant(getConstant) {
  return function initConstantSelector(dispatch, options) {
    const constant = getConstant(dispatch, options)

    function constantSelector() {
      return constant
    }
    constantSelector.dependsOnOwnProps = false
    return constantSelector
  }
}

// dependsOnOwnProps is used by createMapToPropsProxy to determine whether to pass props as args
// to the mapToProps function being wrapped. It is also used by makePurePropsSelector to determine
// whether mapToProps needs to be invoked when props have changed.
//
// A length of one signals that mapToProps does not depend on props from the parent component.
// A length of zero is assumed to mean mapToProps is getting args via arguments or ...args and
// therefore not reporting its length accurately..
export function getDependsOnOwnProps(mapToProps) {
  return mapToProps.dependsOnOwnProps !== null &&
    mapToProps.dependsOnOwnProps !== undefined
    ? Boolean(mapToProps.dependsOnOwnProps)
    : mapToProps.length !== 1
}

// Used by whenMapStateToPropsIsFunction and whenMapDispatchToPropsIsFunction,
// this function wraps mapToProps in a proxy function which does several things:
//
//  * Detects whether the mapToProps function being called depends on props, which
//    is used by selectorFactory to decide if it should reinvoke on props changes.
//    检测 mapToProps函数是否依赖 props属性，检测结果可以给 selectorFactory 来判断 mapToProps 是否需要在props改变的时候重新计算
//
//  * On first call, handles mapToProps if returns another function, and treats that
//    new function as the true mapToProps for subsequent calls.
//    // 首次调用时，如果mapToProps 返回另一个函数，那么将这个新的函数作为之后调用中真正的 mapToProps 函数
//
//  * On first call, verifies the first result is a plain object, in order to warn
//    the developer that their mapToProps function is not returning a valid result.
//    首次调用时，确保调用结果为一个 plainObject，用来提醒开发者 mapToProps 没有返回一个 合理的 result
//
export function wrapMapToPropsFunc(mapToProps, methodName) {
  return function initProxySelector(dispatch, { displayName }) {
    const proxy = function mapToPropsProxy(stateOrDispatch, ownProps) {
      return proxy.dependsOnOwnProps
        ? proxy.mapToProps(stateOrDispatch, ownProps) // 【proxy.mapToProps】 是会不断更新的
        : proxy.mapToProps(stateOrDispatch)
    }

    // allow detectFactoryAndVerify to get ownProps
    proxy.dependsOnOwnProps = true

    // TODO ??? 真的不会死循环吗？？？？——不会
    // 进入后更新了 proxy.mapToProps，在之后调用的 proxy(state, props)中，使用的 proxy.mapToProps 是更新的
    // 初始化的 mapTOProps 为 传入的 mapStateToProps，那么再之后的额 proxy 函数中，这里就是直接返回了 mapStateToProps 函数的返回值
    // 因为这个函数是 mapStateToProps 和 mapDispatchToProps 公用的，
    // 对于 mapDispatchToProps 而言，其返回值可能为函数（bindActionCreators）
    // 当返回值为函数时，将proxy.mapToProps 更新为返回的这个新函数，这个新函数也接受 两个参数（xxx, dispatch），
    proxy.mapToProps = function detectFactoryAndVerify(
      stateOrDispatch,
      ownProps
    ) {
      proxy.mapToProps = mapToProps // 【proxy.mapToProps】初始化为传入的 mapToProps(mapStateToProps 或 mapDispatchToProps)
      proxy.dependsOnOwnProps = getDependsOnOwnProps(mapToProps)
      let props = proxy(stateOrDispatch, ownProps)

      // 如果 mapToProps的返回值为一个 function，那么将这个返回的新function 作为之后调用中的 mapToProps 函数
      // 例如 当mapDispatchToProps 的返回值为 bindActionCreators 函数时就会走到这个流程
      if (typeof props === 'function') {
        proxy.mapToProps = props // 【proxy.mapToProps】二次更新，为 初始化 mapToProps时返回的 函数
        proxy.dependsOnOwnProps = getDependsOnOwnProps(props)
        props = proxy(stateOrDispatch, ownProps) // 使用新的 mapToProps，调用这个函数获取返回值
      }

      if (process.env.NODE_ENV !== 'production')
        verifyPlainObject(props, displayName, methodName)

      return props
    }

    return proxy
  }
}
