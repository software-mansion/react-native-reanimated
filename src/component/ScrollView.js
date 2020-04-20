import React, {useCallback} from "react"
import {RNScrollView} from "react-native";
import createAnimatedComponent from "../createAnimatedComponent";

const DefaultScrollView = createAnimatedComponent(RNScrollView);

export default React.forwardRef(
	function AnimatedScrollView(props, refProp){
		const addMixin = useCallback(
			instance => {
				if (instance)
					Object.assign(instance, mixin);

				setRef(refProp, instance);
			},
			[refProp],
		)

		return <DefaultScrollView ref={refProp && addMixin} {...props}/>;
	}
);

function setRef(refProp, instance){
	if (refProp instanceof Function)
		refProp(instance);
	else if (refProp instanceof Object)
		refProp.current = instance;
}

const mixin = {
	scrollTo: function scrollTo(...params){
		this.current.getNode().scrollTo(...params);
	}
};
