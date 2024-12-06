import Benchmark from 'benchmark';

// Dataset: Create a large array for the test
const largeArray = Array.from({ length: 1e1 }, (_, i) => i);

// Benchmark Suite
const suite = new Benchmark.Suite();

console.log('Benchmarking different looping methods...');

// Add each loop method to the suite
suite
  .add('for loop', function () {
    let a = 'abc';
    let b = 'cdf';
    let c = `${a}/${b}`;
  })
  .add('for...of loop', function () {
    let a = 'abc/vfe';
    let [b, c] = a.split('/');
  })
  // Add listeners
  .on('cycle', function (event) {
    console.log(String(event.target));
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  // Run async
  .run({ async: true });
