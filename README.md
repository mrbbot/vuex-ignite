# Vuex Ignite
Easy to use Vuex Firebase bindings inspired by [posva/vuexfire](https://github.com/posva/vuexfire) and
[vuejs/vuefire](https://github.com/vuejs/vuefire).

## Installation
Install with yarn or npm:
```bash
npm install vuex-ignite

yarn add vuex-ignite
```

## Usage
First *ignite* the store by importing the `ignite` function and wrapping the store options with it.

```js
import { ignite } from 'vuex-ignite';

export default new Vuex.Store(ignite({
    state: {
        counter: 0
    },
    mutations: {
        incrementCounter(state) {
            state.counter++;
        }
    }
}));
```

This automatically adds the necessary Firebase mutations and action along with a plugin that will automatically
dispatch that action when the store is ready.

The `ignite` function will read information about how you want to bind data from the `firebase` object in the store
options. The simplest way is to provide the name of which to bind to and a reference to the data.

```js
import { ignite } from 'vuex-ignite';
import * as firebase from 'firebase';

const app = firebase.initializeApp({ ... });
const db = app.database();

export default new Vuex.Store(ignite({
    firebase: {
        tasks: db.ref('myTasks')
    }
}));
```

In a Vue component:

```vue
<template>
    <ul>
        <li v-for="task in tasks" :key="item['.key']">{{task}}</li>
    </ul>
</template>

<script>
    import { mapState } from 'vuex';

    export default {
        computed: {
            ...mapState(['tasks'])
        }
    }
</script>
```

Notice that the key for the list item is available as the `.key` property. 

By default, this will bind the reference as an array to a new `tasks` array in the store's state. Querying is also
supported, meaning you could replace `db.ref('myTasks')` with `db.ref('myTasks').orderByValue()` for instance.

If you didn't want to bind tasks as an array but as an object to, you must replace the definition with this:

```js
firebase: {
    tasks: {
        ref: db.ref('settings'),
        type: Object
    }
}
```

You can also replace the type with `String`, `Boolean`, `Number`, or `Array` to give a nicer default value. As with
`.key`, if the value is primitive, the value will be stored in `.value`.

### User Based Bindings
Now let's imagine that the tasks reference needs to be based on the currently authenticated Firebase user. Instead of
explicitly defining of database references, we can define them as functions that return references. These functions take
the current user as their first parameter. Here's an example:

```js
const auth = app.auth();

...

firebase: {
    user: auth,
    tasks: {
        ref: user => db.ref(`${user.uid}/tasks`),
        type: Array
    }
}
```

Every time the authentication state changes this reference will be redetermined and bound to `tasks`.

Notice that we also define a `user` property and bind the Firebase Auth instance to it. This doesn't have to be called
`user`, but it does have to be included for these functional bindings to work. This has the side effect of granting access
to the currently authenticated user in the store or anywhere else in your application.

### Updating Data
Every time a reference is bound to the store's state, a corresponding `$firebaseRef` variable is set in the store
allowing data to be changed easily, even if it's user dependent.

```vue
<template>
    <button @click="addTask"></button>
</template>

<script>
    import { mapState } from 'vuex';

    export default {
        methods: {
            addTask() {
                this.$store.$firebaseRefs.tasks.push("New task");
            }
        }
    }
</script>
```
