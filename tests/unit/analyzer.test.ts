describe('Analyzer', () => {
  it('should be importable', () => {
    const { Analyzer } = require('../../src/agent/analyzer');
    expect(Analyzer).toBeDefined();
  });

  it('should instantiate', () => {
    const { Analyzer } = require('../../src/agent/analyzer');
    expect(new Analyzer({} as never)).toBeInstanceOf(Analyzer);
  });
});
