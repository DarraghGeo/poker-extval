/**
 * Lazy properties: computed the first time they are read, then stored as plain values.
 *
 * @license MIT
 * @copyright Copyright (c) 2025 Darragh Geoghegan
 */

/**
 * Defines an enumerable property whose value is computed on first read, then replaces itself with a
 * normal data property. Because it is enumerable, JSON.stringify, object spread, Object.keys,
 * structuredClone and deep-equality checks see it like any other property (reading it computes it).
 * Assigning to it before it is read stores the assigned value instead.
 *
 * @param {Object} obj - The object to define the property on
 * @param {string} key - The property name
 * @param {Function} compute - Returns the value; called at most once
 * @returns {Object} obj
 */
function defineLazy(obj, key, compute) {
  const store = value => {
    Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
    return value;
  };
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: () => store(compute()),
    set: store
  });
  return obj;
}

/**
 * Each object's compute function for defineLazyGroup, under a non-enumerable symbol: invisible to
 * JSON, Object.keys, spread, structuredClone and deep-equality checks, and much cheaper than a
 * WeakMap when objects are created by the thousand.
 */
const STATE = Symbol('lazyState');
const stateDescriptor = { value: null, writable: true, enumerable: false, configurable: true };
const groupDescriptors = new Map();

/**
 * Like defineLazy for several properties at once, for objects created in large numbers: the
 * getters are shared between objects rather than created for each one, and `compute(key)` is
 * called once per property, on first read.
 *
 * @param {Object} obj - The object to define the properties on
 * @param {string[]} keys - The property names (the same array each call, for reuse)
 * @param {Function} compute - (key) => value
 * @returns {Object} obj
 */
function defineLazyGroup(obj, keys, compute) {
  let descriptors = groupDescriptors.get(keys);
  if (!descriptors) {
    descriptors = keys.map(key => {
      const store = (target, value) => {
        Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
        return value;
      };
      return {
        enumerable: true,
        configurable: true,
        get() { return store(this, this[STATE](key)); },
        set(value) { store(this, value); }
      };
    });
    groupDescriptors.set(keys, descriptors);
  }
  stateDescriptor.value = compute;
  Object.defineProperty(obj, STATE, stateDescriptor);
  stateDescriptor.value = null;
  // One defineProperty per key is several times faster than defineProperties
  for (let i = 0; i < keys.length; i++) Object.defineProperty(obj, keys[i], descriptors[i]);
  return obj;
}

/**
 * An empty plain object in dictionary mode, for results keyed by strings that are different every
 * time (such as five-card hands): adding such keys to an ordinary object builds a new hidden class
 * for each one. Key order is kept as usual.
 *
 * @returns {Object}
 */
function keyedObject() {
  const obj = { _: 0 };
  delete obj._;
  return obj;
}

module.exports = { defineLazy, defineLazyGroup, keyedObject };
