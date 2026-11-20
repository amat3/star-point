import { describe, expect, it } from 'vitest'
import { noContactWith } from './no-contact'
import type { ExclusionRule } from './mixing-algorithm'

const exclusions: ExclusionRule[] = [
  { playerA: 'a', playerB: 'b', type: 'no_contact' },
  { playerA: 'a', playerB: 'c', type: 'no_partner' },
  { playerA: 'd', playerB: 'a', type: 'no_contact' },
]

describe('noContactWith', () => {
  it('finds the no_contact players in either direction', () => {
    expect(noContactWith(exclusions, 'a', ['b', 'c', 'd', 'e'])).toEqual(['b', 'd'])
    expect(noContactWith(exclusions, 'b', ['a'])).toEqual(['a'])
  })

  it('ignores the other exclusion types and the player itself', () => {
    expect(noContactWith(exclusions, 'a', ['a', 'c'])).toEqual([])
    expect(noContactWith([], 'a', ['b'])).toEqual([])
  })
})
