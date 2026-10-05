import { describe, expect, it } from 'vitest'
import { extractFromCustomResponses } from './publicTourRoutes.js'

describe('PublicTourRoutes - DMZP Membership Helpers', () => {
  it('extracts institution from direct key in customResponses', () => {
    const responses = {
      institution: 'Mizoram University',
      semester: '4th Sem',
    }
    const result = extractFromCustomResponses(responses, [], ['institution', 'college', 'school'])
    expect(result).toBe('Mizoram University')
  })

  it('extracts course from matched field label in customFormFields', () => {
    const fields = [
      { id: 'f_dept', label: 'Department / Course Name', required: true, type: 'text' },
      { id: 'f_food', label: 'Food Preference', required: false, type: 'text' },
    ]
    const responses = {
      f_dept: 'B.Sc Physics',
      f_food: 'Non-Veg',
    }
    const result = extractFromCustomResponses(responses, fields, ['course', 'subject', 'department'])
    expect(result).toBe('B.Sc Physics')
  })

  it('extracts blood group from customResponses matching keywords', () => {
    const responses = {
      bloodGroup: 'O+',
    }
    const result = extractFromCustomResponses(responses, null, ['blood'])
    expect(result).toBe('O+')
  })

  it('returns undefined if no matching fields are present', () => {
    const responses = {
      tshirt_size: 'XL',
      emergency_contact: '9876543210',
    }
    const result = extractFromCustomResponses(responses, [], ['institution', 'college'])
    expect(result).toBeUndefined()
  })
})
