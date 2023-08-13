import { reactive } from '@vue/reactivity'
import { addEvent, removeEvent } from '../utils/dom'
import {
    ref,
    toRefs,
    computed,
    onBeforeUnmount
} from 'vue'

// 限制移动距离
export const restrictToBounds = function (value, min, max, distance, currZoom) {
    const realDistance = distance / currZoom
    const realValue = value + realDistance
    if (min !== null && realValue < min) {
        const num = distance - (realValue - min) * currZoom
        return { value: min, distance: num }
    }
    if (max !== null && max < realValue) {
        const num = distance - (realValue - max) * currZoom
        return { value: max, distance: num }
    }
    return { value: realValue, distance }
}

// 拖拽移动
export const dragMove = (val, initPosition, currZoom, limitBounds) => {
    const {
        distanceX,
        distanceY,
        left,
        top
    } = val

    const {
        value: leftX,
        distance: distanceLeft
    } = restrictToBounds(initPosition.offsetX, limitBounds.minLeft, limitBounds.maxLeft, distanceX, currZoom)
    const {
        value: leftY,
        distance: distanceTop
    } = restrictToBounds(initPosition.offsetY, limitBounds.minTop, limitBounds.maxTop, distanceY, currZoom)

    return {
        distanceX,
        distanceY,
        targetLeft: leftX,
        targetTop: leftY,
        top: top + distanceTop,
        left: left + distanceLeft
    }
}

// 句柄移动
export const resizeMove = (val, initPosition, currZoom, handle) => {
    let {
        distanceX,
        distanceY,
        width,
        height,
        left,
        top
    } = val
    let { offsetX, offsetY } = initPosition
    let targetWidth = width / currZoom
    let targetHeight = height / currZoom
    // 在不经过缩放后移动的x轴真实距离
    let realDistanceX = 0
    // 在不经过缩放后移动的y轴真实距离
    let realDistanceY = 0
    // 限制最小宽高
    const minDistance = 20
    const maxDistance = 2000
    let objX = null
    let objY = null
    // 拖动中点
    if (handle.includes('m')) {
        switch (handle) {
        // 顶部中心，移动 Y 轴，改变 height 和 top
        case 'tm':
            // 不移动X轴
            distanceX = 0
            // 限制最小移动距离，不能小于高度limit 20，不能大于 2000
            objY = restrictToBounds(targetHeight, minDistance, maxDistance, -distanceY, currZoom)

            // 移动高度
            targetHeight = objY.value
            distanceY = -objY.distance
            realDistanceY = distanceY / currZoom
            offsetY += realDistanceY
            // 悬浮定位移动
            height -= distanceY
            top += distanceY
            break

        // 底部中心，移动 Y 轴，改变 height
        case 'bm':
            // 不移动X轴
            distanceX = 0
            // 限制最小高度
            objY = restrictToBounds(targetHeight, minDistance, maxDistance, distanceY, currZoom)

            targetHeight = objY.value
            // 悬浮定位移动
            height += objY.distance
            break

        // 左边中心，移动 X 轴，改变 width 和 left
        case 'ml':
            // 不移动Y轴
            distanceY = 0
            // 限制最小移动距离，不能小于宽度limit 20
            objX = restrictToBounds(targetWidth, minDistance, maxDistance, -distanceX, currZoom)

            targetWidth = objX.value
            distanceX = -objX.distance
            // 缩放移动的距离
            realDistanceX = distanceX / currZoom
            offsetX += realDistanceX
            // 悬浮定位移动
            width -= distanceX
            left += distanceX
            break

        // 左边中心，移动 X 轴，改变 width
        case 'mr':
            // 不移动Y轴
            distanceY = 0
            // 限制最小移动距离，不能小于宽度limit 20
            objX = restrictToBounds(targetWidth, minDistance, maxDistance, distanceX, currZoom)

            targetWidth = objX.value
            // 悬浮定位移动
            width += objX.distance
            break
        }
        // 反推宽高
    } else {
        // 拖动顶点
        switch (handle) {
        // 左上顶点，移动 X，Y 轴，改变 width、heith、left、top
        case 'tl':
            // 限制最小移动距离，不能小于宽高 limit
            objY = restrictToBounds(targetHeight, minDistance, maxDistance, -distanceY, currZoom)
            objX = restrictToBounds(targetWidth, minDistance, maxDistance, -distanceX, currZoom)
            // 缩放移动的距离
            distanceY = -objY.distance
            distanceX = -objX.distance
            targetHeight = objY.value
            targetWidth = objX.value
            realDistanceX = distanceX / currZoom
            realDistanceY = distanceY / currZoom
            offsetX += realDistanceX
            offsetY += realDistanceY
            // 悬浮定位移动
            width -= distanceX
            height -= distanceY
            left += distanceX
            top += distanceY
            break

        // 右上顶点，移动 X，Y 轴，改变 width、heith、top，不改变 left
        case 'tr':
            // 限制最小移动距离
            objY = restrictToBounds(targetHeight, minDistance, maxDistance, -distanceY, currZoom)
            objX = restrictToBounds(targetWidth, minDistance, maxDistance, distanceX, currZoom)
            distanceY = -objY.distance
            distanceX = objX.distance
            targetHeight = objY.value
            targetWidth = objX.value
            // 缩放移动的距离
            realDistanceY = distanceY / currZoom
            offsetY += realDistanceY
            // 悬浮定位移动
            width += distanceX
            height -= distanceY
            top += distanceY
            break

        // 左下顶点，移动 X, Y 轴，改变 width、height、left，不改变 top
        case 'bl':
            objY = restrictToBounds(targetHeight, minDistance, maxDistance, distanceY, currZoom)
            objX = restrictToBounds(targetWidth, minDistance, maxDistance, -distanceX, currZoom)
            distanceY = objY.distance
            distanceX = -objX.distance
            targetHeight = objY.value
            targetWidth = objX.value
            // 缩放移动的距离
            realDistanceX = distanceX / currZoom
            offsetX += realDistanceX
            // 悬浮定位移动
            width -= distanceX
            height += distanceY
            left += distanceX
            break

        // 右下顶点，移动 X, Y 轴，改变 width、height，不改变 top、left
        case 'br':
            objY = restrictToBounds(targetHeight, minDistance, maxDistance, distanceY, currZoom)
            objX = restrictToBounds(targetWidth, minDistance, maxDistance, distanceX, currZoom)
            distanceY = objY.distance
            distanceX = objX.distance
            targetHeight = objY.value
            targetWidth = objX.value

            // 悬浮定位移动
            width += distanceX
            height += distanceY
            break
        }
    }
    return {
        isResize: true,
        distanceX,
        distanceY,
        targetWidth: Number.parseInt(targetWidth),
        targetHeight: Number.parseInt(targetHeight),
        targetLeft: offsetX,
        targetTop: offsetY,
        width,
        height,
        top,
        left
    }
}


export function useDragResize (options = {}) {
  // 自定义选项
  const customOptions = {
    targetDom: null,
    preventDefault: true,
    stopPropagation: true,
    scaleZoom = 1,
    axis = 'both',
    mouseEvent: {
      start: 'mousedown',
      move: 'mousemove',
      end: 'mouseup'
    },
    onStart: () => {}, // 拖拽开始
    onMove: () => {}, // 拖拽中
    onEnd: () => {}, // 拖拽结束
  }

  const dragOptions = reactive(Object.assign(customOptions, options))

    // 鼠标状态
    const mouseClickPosition = ref({
        mouseX: 0,
        mouseY: 0,
        width: 0,
        height: 0,
        left: 0,
        top: 0,
        parentWidth: 0,
        parentHeight: 0
    })

    const pressedDelta = ref({})

    const handleEvent = (e) => {
      dragOptions.preventDefault && e.preventDefault()
      dragOptions.stopPropagation && e.stopPropagation()
    }

    // 开始拖拽
    const elementDown = function (e, config = {}) {
        // 只能按住鼠标左键触发，e.which 返回一个数字，1是鼠标左键, 2是滚轮按钮或中间按钮（如果有）3是鼠标右键
        if (e instanceof MouseEvent && e.which !== 1) {
            return
        }

        Object.assign(dragOptions, config)

        const triggerTarget = dragOptions.targetDom || e.target || e.srcElement

        const { left, top, width, height } = triggerTarget.getBoundingClientRect()

        Object.assign(mouseClickPosition.value, {
            mouseX: e.pageX,
            mouseY: e.pageY,
            width: width,
            height: height,
            left: left,
            top: top,
            distanceX: 0,
            distanceY: 0
        })
        if (onStart?.(mouseClickPosition.value, e) === false) {
            return
        }
        Object.assign(pressedDelta.value, mouseClickPosition.value)

        addEvent(document.documentElement, dragOptions.mouseEvent.move, dragMove)
        addEvent(document.documentElement, dragOptions.mouseEvent.end, dragEnd)
        handleEvent(e)
    }

    // 拖拽移动
    const dragMove = function (e) {
        const { mouseX, mouseY } = mouseClickPosition.value

        let distanceX = 0 // 移动距离X
        let distanceY = 0 // 移动距离Y

        if (axis === 'x' || axis === 'both') {
            distanceX = Number.parseInt(e.pageX - mouseX)
        }
        if (axis === 'y' || axis === 'both') {
            distanceY = Number.parseInt(e.pageY - mouseY)
        }
        Object.assign(pressedDelta.value, {
            distanceX,
            distanceY
        })

        onMove?.(pressedDelta.value, e)
        handleEvent(e)
    }

    // 拖拽结束
    const dragEnd = function (e) {
        onEnd?.(pressedDelta.value, e)

        pressedDelta.value = {}
        removeEvent(document.documentElement, dragOptions.mouseEvent.move, dragMove)
        removeEvent(document.documentElement, dragOptions.mouseEvent.end, dragEnd)
        handleEvent(e)
    }

    // 注册拖拽事件
    // addEvent(triggerTarget, dragOptions.mouseEvent.start, elementDown)

    onBeforeUnmount(() => {
        // removeEvent(triggerTarget, dragOptions.mouseEvent.start, elementDown)
        // triggerTarget = null
        mouseClickPosition.value = null
    })

    return {
        ...toRefs(mouseClickPosition),
        mouseClickPosition,
        isDragging: computed(() => Boolean(pressedDelta.value)),
        elementDown
    }
}