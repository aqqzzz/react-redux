import { wrapMapToPropsConstant, wrapMapToPropsFunc } from './wrapMapToProps'

// 参数 mapStateTOProps 是我们在 connect 中传入的第一个参数函数，这个函数对应 conenct mapstateToProps 传入函数的情况
export function whenMapStateToPropsIsFunction(mapStateToProps) {
  return typeof mapStateToProps === 'function'
    ? wrapMapToPropsFunc(mapStateToProps, 'mapStateToProps')
    : undefined
}

export function whenMapStateToPropsIsMissing(mapStateToProps) {
  return !mapStateToProps ? wrapMapToPropsConstant(() => ({})) : undefined
}

export default [whenMapStateToPropsIsFunction, whenMapStateToPropsIsMissing]
