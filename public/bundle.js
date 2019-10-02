
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    let running = false;
    function run_tasks() {
        tasks.forEach(task => {
            if (!task[0](now())) {
                tasks.delete(task);
                task[1]();
            }
        });
        running = tasks.size > 0;
        if (running)
            raf(run_tasks);
    }
    function loop(fn) {
        let task;
        if (!running) {
            running = true;
            raf(run_tasks);
        }
        return {
            promise: new Promise(fulfil => {
                tasks.add(task = [fn, fulfil]);
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(changed, child_ctx);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement !== 'undefined') {
        SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set() {
                // overridden by instance, if it has props
            }
        };
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const URL_LIST = 'https://api.themoviedb.org/3/discover/movie';
    const URL_IMG = 'https://image.tmdb.org/t/p/';
    const IMG_SIZE_LARGE = 'w342/';
    const API_KEY = '?api_key=b6a21b30d0a02dbb844bbfb52fb1d2ec';
    const FILTER_RELEASE_TYPE_THEATRICAL = '&with_release_type=3';
    const FILTER_PRIMARY_RELEASE_DATE_GTE = '&primary_release_date.gte=';

    const UPCOMING = URL_LIST + API_KEY + FILTER_RELEASE_TYPE_THEATRICAL + FILTER_PRIMARY_RELEASE_DATE_GTE;

    /* src/components/MovieCard.svelte generated by Svelte v3.12.1 */

    const file = "src/components/MovieCard.svelte";

    function create_fragment(ctx) {
    	var div1, figure, img, img_src_value, t0, div0, h2, t1, t2, p0, t3, t4, t5, p1, t6, t7, dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			figure = element("figure");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			h2 = element("h2");
    			t1 = text(ctx.title);
    			t2 = space();
    			p0 = element("p");
    			t3 = text("Rating: ");
    			t4 = text(ctx.rate);
    			t5 = space();
    			p1 = element("p");
    			t6 = text("Release: ");
    			t7 = text(ctx.date);
    			attr_dev(img, "src", img_src_value = URL_IMG+IMG_SIZE_LARGE+ctx.poster);
    			attr_dev(img, "alt", ctx.title);
    			attr_dev(img, "class", "svelte-145vxgc");
    			add_location(img, file, 118, 4, 2567);
    			attr_dev(figure, "class", "card-image image svelte-145vxgc");
    			toggle_class(figure, "thumb-placeholder", !ctx.poster);
    			add_location(figure, file, 117, 2, 2495);
    			attr_dev(h2, "class", "svelte-145vxgc");
    			add_location(h2, file, 121, 4, 2668);
    			add_location(p0, file, 122, 4, 2689);
    			add_location(p1, file, 123, 4, 2715);
    			attr_dev(div0, "class", "card-content svelte-145vxgc");
    			add_location(div0, file, 120, 2, 2637);
    			attr_dev(div1, "class", "card card-link svelte-145vxgc");
    			toggle_class(div1, "is-invisible", ctx.invisible);
    			add_location(div1, file, 113, 0, 2360);
    			dispose = listen_dev(div1, "click", prevent_default(ctx.handleClick), false, true);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, figure);
    			append_dev(figure, img);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(h2, t1);
    			append_dev(div0, t2);
    			append_dev(div0, p0);
    			append_dev(p0, t3);
    			append_dev(p0, t4);
    			append_dev(div0, t5);
    			append_dev(div0, p1);
    			append_dev(p1, t6);
    			append_dev(p1, t7);
    			ctx.div1_binding(div1);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.poster) && img_src_value !== (img_src_value = URL_IMG+IMG_SIZE_LARGE+ctx.poster)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (changed.title) {
    				attr_dev(img, "alt", ctx.title);
    			}

    			if (changed.poster) {
    				toggle_class(figure, "thumb-placeholder", !ctx.poster);
    			}

    			if (changed.title) {
    				set_data_dev(t1, ctx.title);
    			}

    			if (changed.rate) {
    				set_data_dev(t4, ctx.rate);
    			}

    			if (changed.date) {
    				set_data_dev(t7, ctx.date);
    			}

    			if (changed.invisible) {
    				toggle_class(div1, "is-invisible", ctx.invisible);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div1);
    			}

    			ctx.div1_binding(null);
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	
         
      let { title, poster, rate, date, id, invisible } = $$props;

      let card; 
      
      // onMount(() => {
      //   console.log('Card ' + id + ' onMount');
      // });

      const dispatch = createEventDispatcher();

      function handleClick() {
        const position = {};
        const imageSize = {};

        position.top = card.getBoundingClientRect().top;
        position.left = card.getBoundingClientRect().left;
        imageSize.width = card.querySelector('img').offsetWidth;
        imageSize.height = card.querySelector('img').offsetHeight;    
        dispatch('click', { id, position, imageSize });
      }

    	const writable_props = ['title', 'poster', 'rate', 'date', 'id', 'invisible'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<MovieCard> was created with unknown prop '${key}'`);
    	});

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('card', card = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('poster' in $$props) $$invalidate('poster', poster = $$props.poster);
    		if ('rate' in $$props) $$invalidate('rate', rate = $$props.rate);
    		if ('date' in $$props) $$invalidate('date', date = $$props.date);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('invisible' in $$props) $$invalidate('invisible', invisible = $$props.invisible);
    	};

    	$$self.$capture_state = () => {
    		return { title, poster, rate, date, id, invisible, card };
    	};

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('poster' in $$props) $$invalidate('poster', poster = $$props.poster);
    		if ('rate' in $$props) $$invalidate('rate', rate = $$props.rate);
    		if ('date' in $$props) $$invalidate('date', date = $$props.date);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('invisible' in $$props) $$invalidate('invisible', invisible = $$props.invisible);
    		if ('card' in $$props) $$invalidate('card', card = $$props.card);
    	};

    	return {
    		title,
    		poster,
    		rate,
    		date,
    		id,
    		invisible,
    		card,
    		handleClick,
    		div1_binding
    	};
    }

    class MovieCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["title", "poster", "rate", "date", "id", "invisible"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "MovieCard", options, id: create_fragment.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.title === undefined && !('title' in props)) {
    			console.warn("<MovieCard> was created without expected prop 'title'");
    		}
    		if (ctx.poster === undefined && !('poster' in props)) {
    			console.warn("<MovieCard> was created without expected prop 'poster'");
    		}
    		if (ctx.rate === undefined && !('rate' in props)) {
    			console.warn("<MovieCard> was created without expected prop 'rate'");
    		}
    		if (ctx.date === undefined && !('date' in props)) {
    			console.warn("<MovieCard> was created without expected prop 'date'");
    		}
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<MovieCard> was created without expected prop 'id'");
    		}
    		if (ctx.invisible === undefined && !('invisible' in props)) {
    			console.warn("<MovieCard> was created without expected prop 'invisible'");
    		}
    	}

    	get title() {
    		throw new Error("<MovieCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<MovieCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get poster() {
    		throw new Error("<MovieCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set poster(value) {
    		throw new Error("<MovieCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rate() {
    		throw new Error("<MovieCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rate(value) {
    		throw new Error("<MovieCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get date() {
    		throw new Error("<MovieCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set date(value) {
    		throw new Error("<MovieCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<MovieCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<MovieCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get invisible() {
    		throw new Error("<MovieCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set invisible(value) {
    		throw new Error("<MovieCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function cubicInOut(t) {
        return t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
    }
    function cubicOut$1(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }
    function sineOut(t) {
        return Math.sin((t * Math.PI) / 2);
    }

    function flip(node, animation, params) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const dx = animation.from.left - animation.to.left;
        const dy = animation.from.top - animation.to.top;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = d => Math.sqrt(d) * 120, easing = cubicOut$1 } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    function fade(node, { delay = 0, duration = 400 }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src/components/MovieGrid.svelte generated by Svelte v3.12.1 */

    const file$1 = "src/components/MovieGrid.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.movie = list[i];
    	return child_ctx;
    }

    // (17:2) {#each movies as movie (movie.id)}
    function create_each_block(key_1, ctx) {
    	var div, t, rect, stop_animation = noop, current;

    	var moviecard = new MovieCard({
    		props: {
    		id: ctx.movie.id,
    		title: ctx.movie.title,
    		rate: ctx.movie.popularity,
    		date: ctx.movie.release_date,
    		poster: ctx.movie.poster_path,
    		invisible: ctx.hidden
    	},
    		$$inline: true
    	});
    	moviecard.$on("click", ctx.click_handler);

    	const block = {
    		key: key_1,

    		first: null,

    		c: function create() {
    			div = element("div");
    			moviecard.$$.fragment.c();
    			t = space();
    			attr_dev(div, "class", "column is-narrow");
    			add_location(div, file$1, 17, 4, 432);
    			this.first = div;
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(moviecard, div, null);
    			append_dev(div, t);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var moviecard_changes = {};
    			if (changed.movies) moviecard_changes.id = ctx.movie.id;
    			if (changed.movies) moviecard_changes.title = ctx.movie.title;
    			if (changed.movies) moviecard_changes.rate = ctx.movie.popularity;
    			if (changed.movies) moviecard_changes.date = ctx.movie.release_date;
    			if (changed.movies) moviecard_changes.poster = ctx.movie.poster_path;
    			if (changed.hidden) moviecard_changes.invisible = ctx.hidden;
    			moviecard.$set(moviecard_changes);
    		},

    		r: function measure_1() {
    			rect = div.getBoundingClientRect();
    		},

    		f: function fix() {
    			fix_position(div);
    			stop_animation();
    		},

    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(div, rect, flip, { duration: 300 });
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(moviecard.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(moviecard.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_component(moviecard);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(17:2) {#each movies as movie (movie.id)}", ctx });
    	return block;
    }

    function create_fragment$1(ctx) {
    	var div, each_blocks = [], each_1_lookup = new Map(), div_transition, current;

    	let each_value = ctx.movies;

    	const get_key = ctx => ctx.movie.id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(div, "class", "columns is-mobile is-centered is-multiline svelte-d8c9xq");
    			add_location(div, file$1, 15, 0, 309);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			const each_value = ctx.movies;

    			group_outros();
    			for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    			each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, div, fix_and_outro_and_destroy_block, create_each_block, null, get_each_context);
    			for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    			check_outros();
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {}, false);
    			div_transition.run(0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (detaching) {
    				if (div_transition) div_transition.end();
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	

      let { movies, hidden } = $$props;

    	const writable_props = ['movies', 'hidden'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<MovieGrid> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ('movies' in $$props) $$invalidate('movies', movies = $$props.movies);
    		if ('hidden' in $$props) $$invalidate('hidden', hidden = $$props.hidden);
    	};

    	$$self.$capture_state = () => {
    		return { movies, hidden };
    	};

    	$$self.$inject_state = $$props => {
    		if ('movies' in $$props) $$invalidate('movies', movies = $$props.movies);
    		if ('hidden' in $$props) $$invalidate('hidden', hidden = $$props.hidden);
    	};

    	return { movies, hidden, click_handler };
    }

    class MovieGrid extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["movies", "hidden"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "MovieGrid", options, id: create_fragment$1.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.movies === undefined && !('movies' in props)) {
    			console.warn("<MovieGrid> was created without expected prop 'movies'");
    		}
    		if (ctx.hidden === undefined && !('hidden' in props)) {
    			console.warn("<MovieGrid> was created without expected prop 'hidden'");
    		}
    	}

    	get movies() {
    		throw new Error("<MovieGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set movies(value) {
    		throw new Error("<MovieGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hidden() {
    		throw new Error("<MovieGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hidden(value) {
    		throw new Error("<MovieGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const movies = writable([]);

    const movieStore = {
      subscribe: movies.subscribe,
      setMovies: items => {
        movies.set(items);
      }
    };

    function animateModal(node, { delay = 100, easing = cubicOut, duration = 400, start = 0, end = 1, x1 = 0, y1 = 0, x2 = 100, y2 = 100, scrollY = 0 }) {
    	node.style.left = `${x2}px`;
    	node.style.top = `${y2}px`;

    	const sd = end - start;
    	const dx = x2 - x1;
    	const dy = y2 - y1;

    	return {
    			delay,
    			duration,
    			easing,
    			css: (t, u) => {
    				return `
					transform: scale(${end - (sd * u)});				
					left: ${x1 + (dx * t)}px;	
					top: ${y1 + (dy * t)}px;						
				`;
    	}};
    }

    /* src/components/MovieModal.svelte generated by Svelte v3.12.1 */

    const file$2 = "src/components/MovieModal.svelte";

    function create_fragment$2(ctx) {
    	var div4, div0, div0_intro, div0_outro, t0, div3, div1, img, t1, div2, h2, t2_value = ctx.movie.title + "", t2, t3, p0, t4_value = ctx.movie.overview + "", t4, t5, br, t6, p1, t7, t8_value = ctx.movie.release_date + "", t8, t9, p2, t10, t11_value = ctx.movie.popularity + "", t11, div2_intro, div2_outro, div3_transition, t12, button, current, dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div3 = element("div");
    			div1 = element("div");
    			img = element("img");
    			t1 = space();
    			div2 = element("div");
    			h2 = element("h2");
    			t2 = text(t2_value);
    			t3 = space();
    			p0 = element("p");
    			t4 = text(t4_value);
    			t5 = space();
    			br = element("br");
    			t6 = space();
    			p1 = element("p");
    			t7 = text("Release date: ");
    			t8 = text(t8_value);
    			t9 = space();
    			p2 = element("p");
    			t10 = text("Rating: ");
    			t11 = text(t11_value);
    			t12 = space();
    			button = element("button");
    			attr_dev(div0, "class", "modal-background svelte-3obxgf");
    			add_location(div0, file$2, 237, 4, 5302);
    			attr_dev(img, "src", URL_IMG+IMG_SIZE_LARGE+ctx.movie.poster_path);
    			attr_dev(img, "alt", ctx.movie.title);
    			attr_dev(img, "class", "svelte-3obxgf");
    			add_location(img, file$2, 244, 8, 5703);
    			attr_dev(div1, "class", "image svelte-3obxgf");
    			attr_dev(div1, "style", ctx.modalImageStyle);
    			toggle_class(div1, "thumb-placeholder", !ctx.movie.poster_path);
    			add_location(div1, file$2, 243, 6, 5606);
    			attr_dev(h2, "class", "svelte-3obxgf");
    			add_location(h2, file$2, 250, 10, 5950);
    			add_location(p0, file$2, 251, 10, 5983);
    			add_location(br, file$2, 252, 10, 6017);
    			add_location(p1, file$2, 253, 10, 6032);
    			add_location(p2, file$2, 254, 10, 6084);
    			attr_dev(div2, "class", "content svelte-3obxgf");
    			add_location(div2, file$2, 246, 6, 5795);
    			attr_dev(div3, "class", "modal-body svelte-3obxgf");
    			attr_dev(div3, "style", ctx.modalBodyStyle);
    			add_location(div3, file$2, 238, 4, 5397);
    			attr_dev(button, "class", "modal-close is-large svelte-3obxgf");
    			attr_dev(button, "aria-label", "close");
    			add_location(button, file$2, 257, 4, 6150);
    			attr_dev(div4, "class", "modal svelte-3obxgf");
    			toggle_class(div4, "is-unclickable", ctx.disableClick);
    			add_location(div4, file$2, 236, 0, 5215);

    			dispose = [
    				listen_dev(div2, "introend", ctx.introend_handler),
    				listen_dev(div3, "introstart", ctx.introstart_handler),
    				listen_dev(div3, "outrostart", ctx.outrostart_handler),
    				listen_dev(div4, "click", ctx.handleClick)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div4, t0);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, img);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, h2);
    			append_dev(h2, t2);
    			append_dev(div2, t3);
    			append_dev(div2, p0);
    			append_dev(p0, t4);
    			append_dev(div2, t5);
    			append_dev(div2, br);
    			append_dev(div2, t6);
    			append_dev(div2, p1);
    			append_dev(p1, t7);
    			append_dev(p1, t8);
    			append_dev(div2, t9);
    			append_dev(div2, p2);
    			append_dev(p2, t10);
    			append_dev(p2, t11);
    			append_dev(div4, t12);
    			append_dev(div4, button);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.movie) {
    				toggle_class(div1, "thumb-placeholder", !ctx.movie.poster_path);
    			}

    			if (changed.disableClick) {
    				toggle_class(div4, "is-unclickable", ctx.disableClick);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (div0_outro) div0_outro.end(1);
    				if (!div0_intro) div0_intro = create_in_transition(div0, fade, { easing: cubicInOut });
    				div0_intro.start();
    			});

    			add_render_callback(() => {
    				if (div2_outro) div2_outro.end(1);
    				if (!div2_intro) div2_intro = create_in_transition(div2, fade, { delay: 600 });
    				div2_intro.start();
    			});

    			add_render_callback(() => {
    				if (!div3_transition) div3_transition = create_bidirectional_transition(div3, animateModal, ctx.animationOpt, true);
    				div3_transition.run(1);
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (div0_intro) div0_intro.invalidate();

    			div0_outro = create_out_transition(div0, fade, { delay: 400 });

    			if (div2_intro) div2_intro.invalidate();

    			div2_outro = create_out_transition(div2, fade, { duration: 0 });

    			if (!div3_transition) div3_transition = create_bidirectional_transition(div3, animateModal, ctx.animationOpt, false);
    			div3_transition.run(0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div4);
    				if (div0_outro) div0_outro.end();
    				if (div2_outro) div2_outro.end();
    				if (div3_transition) div3_transition.end();
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $movieStore;

    	validate_store(movieStore, 'movieStore');
    	component_subscribe($$self, movieStore, $$value => { $movieStore = $$value; $$invalidate('$movieStore', $movieStore); });

    	

      let { id, position, imageSize } = $$props;  

      let disableClick = false;  // disable click when animation

      const movie = $movieStore.find((movie) => movie.id === id);
     
      const modalBodyStyle = `top: ${position.top}px; left: ${position.left}px`;
      const modalImageStyle = `width: ${imageSize.width}px; height: ${imageSize.height}px`; 

      const startTop = position.top;
      const startLeft = position.left;
      const endTop = window.innerHeight/2 - imageSize.height/2;
      const endLeft = document.documentElement.clientWidth/2 - imageSize.width;

      const animationOpt = {
        // duration: 1000,
        easing: sineOut,
        start: 1,
        end: 1.2, 
        x1: startLeft,
        y1: startTop,
        x2: endLeft,
        y2: endTop
      };

      const scrollY = window.scrollY;

      const dispatch = createEventDispatcher();

      function handleClick() {    
        if ( disableClick ) return false;
        dispatch('close');
      }

    	const writable_props = ['id', 'position', 'imageSize'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<MovieModal> was created with unknown prop '${key}'`);
    	});

    	const introend_handler = () => $$invalidate('disableClick', disableClick = false);

    	const introstart_handler = () => $$invalidate('disableClick', disableClick = true);

    	const outrostart_handler = () => window.scroll(0,scrollY);

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('position' in $$props) $$invalidate('position', position = $$props.position);
    		if ('imageSize' in $$props) $$invalidate('imageSize', imageSize = $$props.imageSize);
    	};

    	$$self.$capture_state = () => {
    		return { id, position, imageSize, disableClick, $movieStore };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('position' in $$props) $$invalidate('position', position = $$props.position);
    		if ('imageSize' in $$props) $$invalidate('imageSize', imageSize = $$props.imageSize);
    		if ('disableClick' in $$props) $$invalidate('disableClick', disableClick = $$props.disableClick);
    		if ('$movieStore' in $$props) movieStore.set($movieStore);
    	};

    	return {
    		id,
    		position,
    		imageSize,
    		disableClick,
    		movie,
    		modalBodyStyle,
    		modalImageStyle,
    		animationOpt,
    		scrollY,
    		handleClick,
    		window,
    		introend_handler,
    		introstart_handler,
    		outrostart_handler
    	};
    }

    class MovieModal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["id", "position", "imageSize"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "MovieModal", options, id: create_fragment$2.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<MovieModal> was created without expected prop 'id'");
    		}
    		if (ctx.position === undefined && !('position' in props)) {
    			console.warn("<MovieModal> was created without expected prop 'position'");
    		}
    		if (ctx.imageSize === undefined && !('imageSize' in props)) {
    			console.warn("<MovieModal> was created without expected prop 'imageSize'");
    		}
    	}

    	get id() {
    		throw new Error("<MovieModal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<MovieModal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get position() {
    		throw new Error("<MovieModal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set position(value) {
    		throw new Error("<MovieModal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get imageSize() {
    		throw new Error("<MovieModal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imageSize(value) {
    		throw new Error("<MovieModal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Footer.svelte generated by Svelte v3.12.1 */

    const file$3 = "src/components/Footer.svelte";

    function create_fragment$3(ctx) {
    	var footer, div1, div0, img;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			attr_dev(img, "width", "50");
    			attr_dev(img, "height", "50");
    			attr_dev(img, "src", "images/tmdb.png");
    			attr_dev(img, "alt", "TMDB");
    			add_location(img, file$3, 9, 6, 222);
    			attr_dev(div0, "class", "credits");
    			add_location(div0, file$3, 8, 4, 194);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file$3, 7, 2, 166);
    			attr_dev(footer, "class", "footer svelte-vz291r");
    			add_location(footer, file$3, 6, 0, 140);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div1);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(footer);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$3, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Footer", options, id: create_fragment$3.name });
    	}
    }

    /* src/components/Controls.svelte generated by Svelte v3.12.1 */

    const file$4 = "src/components/Controls.svelte";

    function create_fragment$4(ctx) {
    	var div, button0, t_1, button1, dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "Sort be rate";
    			t_1 = space();
    			button1 = element("button");
    			button1.textContent = "Sort by date";
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "button svelte-1q5kils");
    			toggle_class(button0, "is-active", ctx.selectedButton === 'rate');
    			add_location(button0, file$4, 885, 2, 40797);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "button svelte-1q5kils");
    			toggle_class(button1, "is-active", ctx.selectedButton === 'date');
    			add_location(button1, file$4, 895, 2, 41019);
    			attr_dev(div, "class", "controls svelte-1q5kils");
    			add_location(div, file$4, 884, 0, 40772);

    			dispose = [
    				listen_dev(button0, "click", ctx.click_handler),
    				listen_dev(button1, "click", ctx.click_handler_1)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(div, t_1);
    			append_dev(div, button1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.selectedButton) {
    				toggle_class(button0, "is-active", ctx.selectedButton === 'rate');
    				toggle_class(button1, "is-active", ctx.selectedButton === 'date');
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    function sortByDate(movie1, movie2){
     if (movie1.release_date === movie2.release_date) return 0;
     return movie1.release_date > movie2.release_date ? 1 : -1;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

      let selectedButton = 'rate';
    	const click_handler = () => {
    	      $$invalidate('selectedButton', selectedButton = 'rate');
    	      dispatch('select', 'default');
    	    };

    	const click_handler_1 = () => {
    	      $$invalidate('selectedButton', selectedButton = 'date');
    	      dispatch('select', sortByDate);
    	    };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('selectedButton' in $$props) $$invalidate('selectedButton', selectedButton = $$props.selectedButton);
    	};

    	return {
    		dispatch,
    		selectedButton,
    		click_handler,
    		click_handler_1
    	};
    }

    class Controls extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Controls", options, id: create_fragment$4.name });
    	}
    }

    const currentDate = new Date();

    let day = currentDate.getDate();
    let month = currentDate.getMonth() + 1; // Cause January is 0 not 1
    let year = currentDate.getFullYear();

    if (month < 10) {
      month = '0' + month;
    }

    if (day < 10) {
      day = '0' + day;
    }
    const formattedDate = year + "-" + month + "-" + day;

    /* src/App.svelte generated by Svelte v3.12.1 */
    const { Error: Error_1 } = globals;

    const file$5 = "src/App.svelte";

    // (1581:2) {:else}
    function create_else_block(ctx) {
    	var current;

    	var moviegrid = new MovieGrid({
    		props: {
    		movies: ctx.sortedMovies,
    		hidden: ctx.modal
    	},
    		$$inline: true
    	});
    	moviegrid.$on("click", ctx.showModal);

    	const block = {
    		c: function create() {
    			moviegrid.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(moviegrid, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var moviegrid_changes = {};
    			if (changed.sortedMovies) moviegrid_changes.movies = ctx.sortedMovies;
    			if (changed.modal) moviegrid_changes.hidden = ctx.modal;
    			moviegrid.$set(moviegrid_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(moviegrid.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(moviegrid.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(moviegrid, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(1581:2) {:else}", ctx });
    	return block;
    }

    // (1579:2) {#if isLoading}
    function create_if_block_1(ctx) {
    	var div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "...Is loading";
    			attr_dev(div, "class", "loading");
    			add_location(div, file$5, 1579, 4, 50493);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(1579:2) {#if isLoading}", ctx });
    	return block;
    }

    // (1588:2) {#if modal}
    function create_if_block(ctx) {
    	var current;

    	var moviemodal = new MovieModal({
    		props: {
    		id: ctx.clickedMovieDetails.id,
    		position: ctx.clickedMovieDetails.position,
    		imageSize: ctx.clickedMovieDetails.imageSize
    	},
    		$$inline: true
    	});
    	moviemodal.$on("close", ctx.closeModal);

    	const block = {
    		c: function create() {
    			moviemodal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(moviemodal, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var moviemodal_changes = {};
    			if (changed.clickedMovieDetails) moviemodal_changes.id = ctx.clickedMovieDetails.id;
    			if (changed.clickedMovieDetails) moviemodal_changes.position = ctx.clickedMovieDetails.position;
    			if (changed.clickedMovieDetails) moviemodal_changes.imageSize = ctx.clickedMovieDetails.imageSize;
    			moviemodal.$set(moviemodal_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(moviemodal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(moviemodal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(moviemodal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(1588:2) {#if modal}", ctx });
    	return block;
    }

    function create_fragment$5(ctx) {
    	var div, h1, t1, t2, current_block_type_index, if_block0, t3, t4, current;

    	var controls = new Controls({ $$inline: true });
    	controls.$on("select", ctx.setSorting);

    	var if_block_creators = [
    		create_if_block_1,
    		create_else_block
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.isLoading) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	var if_block1 = (ctx.modal) && create_if_block(ctx);

    	var footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Upcoming movies";
    			t1 = space();
    			controls.$$.fragment.c();
    			t2 = space();
    			if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			footer.$$.fragment.c();
    			add_location(h1, file$5, 1576, 2, 50407);
    			attr_dev(div, "class", "container");
    			add_location(div, file$5, 1575, 0, 50381);
    		},

    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			mount_component(controls, div, null);
    			append_dev(div, t2);
    			if_blocks[current_block_type_index].m(div, null);
    			append_dev(div, t3);
    			if (if_block1) if_block1.m(div, null);
    			insert_dev(target, t4, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block0 = if_blocks[current_block_type_index];
    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				}
    				transition_in(if_block0, 1);
    				if_block0.m(div, t3);
    			}

    			if (ctx.modal) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				group_outros();
    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(controls.$$.fragment, local);

    			transition_in(if_block0);
    			transition_in(if_block1);

    			transition_in(footer.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(controls.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_component(controls);

    			if_blocks[current_block_type_index].d();
    			if (if_block1) if_block1.d();

    			if (detaching) {
    				detach_dev(t4);
    			}

    			destroy_component(footer, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $movieStore;

    	validate_store(movieStore, 'movieStore');
    	component_subscribe($$self, movieStore, $$value => { $movieStore = $$value; $$invalidate('$movieStore', $movieStore); });

    	 
     
      let isLoading = true;
      let modal = false; 
      let clickedMovieDetails;
      let sortTypeFn;
      
      const URL = UPCOMING + formattedDate;

      onMount(() => {
        fetch(URL)
          .then(res => {
            if (!res.ok) {
              throw new Error("Connection failed");
            }
            return res.json();
          })
          .then(data => {
            if (!data.results.length) {
            throw new Error("Results is empty");
            }
            $$invalidate('isLoading', isLoading = false);
            movieStore.setMovies(data.results);
          })
          .catch(error => {
            console.error(error);
          });
      });

      function showModal(event) {
        $$invalidate('modal', modal = true);
        $$invalidate('clickedMovieDetails', clickedMovieDetails = event.detail);
      }

      function closeModal() {
        $$invalidate('modal', modal = false);
        $$invalidate('clickedMovieDetails', clickedMovieDetails = null);
      }

      function setSorting(event){
        $$invalidate('sortTypeFn', sortTypeFn = event.detail);
      }

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('isLoading' in $$props) $$invalidate('isLoading', isLoading = $$props.isLoading);
    		if ('modal' in $$props) $$invalidate('modal', modal = $$props.modal);
    		if ('clickedMovieDetails' in $$props) $$invalidate('clickedMovieDetails', clickedMovieDetails = $$props.clickedMovieDetails);
    		if ('sortTypeFn' in $$props) $$invalidate('sortTypeFn', sortTypeFn = $$props.sortTypeFn);
    		if ('sortedMovies' in $$props) $$invalidate('sortedMovies', sortedMovies = $$props.sortedMovies);
    		if ('$movieStore' in $$props) movieStore.set($movieStore);
    	};

    	let sortedMovies;

    	$$self.$$.update = ($$dirty = { sortTypeFn: 1, $movieStore: 1 }) => {
    		if ($$dirty.sortTypeFn || $$dirty.$movieStore) { $$invalidate('sortedMovies', sortedMovies = sortTypeFn === 'default' ? $movieStore : [...$movieStore].sort(sortTypeFn)); }
    	};

    	return {
    		isLoading,
    		modal,
    		clickedMovieDetails,
    		showModal,
    		closeModal,
    		setSorting,
    		sortedMovies
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$5.name });
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
