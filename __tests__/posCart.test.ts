import { decideCheckoutNavigation } from '../src/utils/posCart';

describe('decideCheckoutNavigation', () => {
  it('closes the cart sheet before navigating when it is visible', () => {
    expect(decideCheckoutNavigation({ cartVisible: true, navigating: false })).toBe('close_then_navigate');
  });

  it('navigates immediately when the cart sheet is already closed', () => {
    expect(decideCheckoutNavigation({ cartVisible: false, navigating: false })).toBe('navigate');
  });

  it('ignores repeated taps while a checkout navigation is already in flight', () => {
    expect(decideCheckoutNavigation({ cartVisible: true, navigating: true })).toBe('ignore');
    expect(decideCheckoutNavigation({ cartVisible: false, navigating: true })).toBe('ignore');
  });
});
