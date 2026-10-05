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

  it('avoids matching generic pickup location fields for address', () => {
    const fields = [
      { id: 'f_pickup', label: 'Pickup Location', required: true, type: 'text' },
      { id: 'f_drop', label: 'Drop-off Location', required: false, type: 'text' },
      { id: 'f_addr', label: 'Residential Address in Delhi', required: false, type: 'text' },
    ]
    const responses = {
      f_pickup: 'Kashmiri Gate ISBT',
      f_drop: 'Majnu Ka Tilla',
      f_addr: 'A-12, Christian Colony, Patel Nagar',
    }
    const result = extractFromCustomResponses(
      responses,
      fields,
      ['residential address', 'home address', 'permanent address', 'current address', 'membership address', 'address', 'veng', 'khua']
    )
    expect(result).toBe('A-12, Christian Colony, Patel Nagar')
  })

  it('ignores pickup location even if it has address in keyword search when no residential address provided', () => {
    const fields = [
      { id: 'f_pickup', label: 'Tour Departure Pickup Location', required: true, type: 'text' },
    ]
    const responses = {
      f_pickup: 'New Delhi Railway Station',
    }
    const result = extractFromCustomResponses(
      responses,
      fields,
      ['residential address', 'home address', 'address', 'veng', 'khua']
    )
    expect(result).toBeUndefined()
  })
})
