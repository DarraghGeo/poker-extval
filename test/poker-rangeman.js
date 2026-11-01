// Test-only stand-in for poker-rangeman. Jest's own module loader cannot require() ES modules,
// so jest.config maps 'poker-rangeman' here, and this loads the real package through Node's
// require, exactly as the library gets it in Node.
module.exports = process.getBuiltinModule('module').createRequire(__filename)('poker-rangeman');
