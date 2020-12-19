/**@module web/eventAccess */


/**
 * Receiving native event object from general event object
 * @param {object} event event object passed by event
 * @return {object} native event object
 */
export const webEventAccess = event => {
    return event.nativeEvent;
}