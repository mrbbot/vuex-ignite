/*!
 * VuexIgnite v0.1.1
 * Copyright (c) 2018 MrBBot
 * Licensed under the MIT license.
 */

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

const isFunction = obj => !!(obj && obj.constructor && obj.call && obj.apply);
const isPrimitive = obj => obj !== Object(obj);
const defaultValue = type => {
    switch (type) {
        case Boolean:
            return false;
        case Number:
            return 0;
        case Object:
            return null;
        case String:
            return "";
        case Array:
            return null;
        default:
            return void 0;
    }
};

const NAMESPACE = "firebase";
const FIREBASE_SET = `${NAMESPACE}/SET`;
const FIREBASE_LIST_INIT = `${NAMESPACE}/LIST_INIT`;
const FIREBASE_LIST_ADD = `${NAMESPACE}/LIST_ADD`;
const FIREBASE_LIST_CHANGE = `${NAMESPACE}/LIST_CHANGE`;
const FIREBASE_LIST_REMOVE = `${NAMESPACE}/LIST_REMOVE`;
const FIREBASE_LIST_MOVE = `${NAMESPACE}/LIST_MOVE`;
const FIREBASE_ACTION = `${NAMESPACE}/ACTION`;

function ignite(storeOptions) {
    storeOptions = Object.assign({
        state: {},
        mutations: {},
        actions: {},
        plugins: []
    }, storeOptions);

    let authBinding;
    let normalisedBindings = [];
    for (let binding in storeOptions.firebase) {
        const bindingObject = storeOptions.firebase[binding];
        const ref = (bindingObject.constructor.name === 'Query' ? undefined : bindingObject.ref) || bindingObject;
        const refName = ref.constructor.name;
        if (refName === 'Reference' || refName === 'Function' || refName === 'Query') {
            const type = bindingObject.type || Array;
            storeOptions.state[binding] = defaultValue(type);
            normalisedBindings.push({
                name: binding,
                ref: ref,
                type: type
            });
        } else {
            storeOptions.state[binding] = false;
            authBinding = {
                name: binding,
                auth: ref
            };
        }
    }

    storeOptions.mutations[FIREBASE_LIST_INIT] = (state, { key }) => state[key] = [];
    storeOptions.mutations[FIREBASE_SET] = (state, { key, value }) => state[key] = value;
    storeOptions.mutations[FIREBASE_LIST_ADD] = (state, { key, value }) => state[key] = [...state[key], value];
    storeOptions.mutations[FIREBASE_LIST_CHANGE] = (state, { key, value }) => {
        const index = state[key].findIndex(v => v['.key'] === value['.key']);
        state[key] = [...state[key]];
        state[key].splice(index, 1, value);
    };
    storeOptions.mutations[FIREBASE_LIST_REMOVE] = (state, { key, listKey }) => state[key] = state[key].filter(v => v['.key'] !== listKey);
    storeOptions.mutations[FIREBASE_LIST_MOVE] = (state, { key, listKey, prevListKey }) => {
        const currentIndex = state[key].findIndex(v => v['.key'] === listKey);
        const newPreviousIndex = prevListKey !== null ? state[key].findIndex(v => v['.key'] === prevListKey) : 0;
        state[key] = [...state[key]];
        state[key].splice(newPreviousIndex, 0, state[key].splice(currentIndex, 1)[0]);
    };

    storeOptions.actions[FIREBASE_ACTION] = ({ commit }, { authBinding, normalisedBindings, store }) => {
        const bind = (type, ref, name) => {
            store.$firebaseRefs[name] = ref.ref || ref;
            if (type === Array) {
                ref.once('value', () => {
                    commit(FIREBASE_LIST_INIT, {
                        key: name
                    });

                    ref.on('child_added', data => {
                        const val = data.val();
                        commit(FIREBASE_LIST_ADD, {
                            key: name,
                            value: _extends({
                                '.key': data.key
                            }, isPrimitive(val) ? { '.value': val } : val)
                        });
                    });
                    ref.on('child_changed', data => {
                        const val = data.val();
                        commit(FIREBASE_LIST_CHANGE, {
                            key: name,
                            value: _extends({
                                '.key': data.key
                            }, isPrimitive(val) ? { '.value': val } : val)
                        });
                    });
                    ref.on('child_removed', data => commit(FIREBASE_LIST_REMOVE, {
                        key: name,
                        listKey: data.key
                    }));
                    ref.on('child_moved', (data, prevKey) => commit(FIREBASE_LIST_MOVE, {
                        key: name,
                        listKey: data.key,
                        prevListKey: prevKey
                    }));
                });
            } else {
                ref.on('value', data => commit(FIREBASE_SET, {
                    key: name,
                    value: data.val()
                }));
            }
        };

        const functionalBindings = [];
        for (let binding of normalisedBindings) {
            if (isFunction(binding.ref)) functionalBindings.push(binding);else bind(binding.type, binding.ref, binding.name);
        }

        if (authBinding) {
            // noinspection JSUnresolvedFunction
            authBinding.auth.onAuthStateChanged(user => {
                for (let functionalBinding of functionalBindings) {
                    if (functionalBinding.currentRef) functionalBinding.currentRef.off();
                    if (store.$firebaseRefs[functionalBinding.name]) delete store.$firebaseRefs[functionalBinding.name];

                    if (!user) {
                        commit(FIREBASE_SET, {
                            key: functionalBinding.name,
                            value: defaultValue(functionalBinding.type)
                        });
                    } else {
                        const ref = functionalBinding.ref(user);
                        functionalBinding.currentRef = ref;
                        bind(functionalBinding.type, ref, functionalBinding.name);
                    }
                }

                commit(FIREBASE_SET, {
                    key: authBinding.name,
                    value: user
                });
            });
        }
    };

    storeOptions.plugins.push(store => {
        store.$firebaseRefs = {};
        // noinspection JSIgnoredPromiseFromCall
        store.dispatch(FIREBASE_ACTION, { authBinding, normalisedBindings, store });
    });

    return storeOptions;
}

export { ignite };
