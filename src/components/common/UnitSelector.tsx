import React, { useState, useEffect } from 'react'
import { FormSelect, FormGroup } from '../ui/Form'
import { invoke } from '@tauri-apps/api/tauri'

export interface OwnerUnit {
  unit_id: string
  unit_name: string
  unit_abbr: string | null
  parent_id: string | null
  unit_level: number | null
}

interface UnitSelection {
  l1: string
  l2: string
  l3: string
  l4: string
  finalUnitId: string
  unitCode: string
}

interface UnitSelectorProps {
  onSelectionChange: (selection: UnitSelection) => void
  label?: string
  className?: string
  defaultUnitCode?: string // Added to support pre-filling (implementation pending)
}

const UnitSelector: React.FC<UnitSelectorProps> = ({ onSelectionChange, label, className }) => {
  const [selectedL1, setSelectedL1] = useState<string>('navy') // Default 'navy'

  const [l2Units, setL2Units] = useState<OwnerUnit[]>([])
  const [l3Units, setL3Units] = useState<OwnerUnit[]>([])
  const [l4Units, setL4Units] = useState<OwnerUnit[]>([])

  const [selectedL2, setSelectedL2] = useState<string>('')
  const [selectedL3, setSelectedL3] = useState<string>('')
  const [selectedL4, setSelectedL4] = useState<string>('')

  // Load L2 based on L1
  useEffect(() => {
    // Reset lower levels when L1 changes
    setL2Units([])
    setL3Units([])
    setL4Units([])
    setSelectedL2('')
    setSelectedL3('')
    setSelectedL4('')

    if (selectedL1 === 'navy') {
      const loadRootUnits = async () => {
        try {
          const units = await invoke<OwnerUnit[]>('get_owner_units', { parentId: null })
          // If single root (Navy), load its children
          if (units.length === 1 && units[0].unit_level === 1) {
            loadChildren(units[0].unit_id, setL2Units)
          } else {
            setL2Units(units)
          }
        } catch (err) {
          console.error("Failed to load units:", err)
        }
      }
      loadRootUnits()
    } else {
      // Army or Air Force: No data yet
      // l2Units is already []
    }
  }, [selectedL1])

  const loadChildren = async (parentId: string, setter: React.Dispatch<React.SetStateAction<OwnerUnit[]>>) => {
    try {
      const units = await invoke<OwnerUnit[]>('get_owner_units', { parentId })
      setter(units)
    } catch (err) {
      console.error(`Failed to load children for ${parentId}:`, err)
    }
  }

  // Effect: When L2 changes
  useEffect(() => {
    setL3Units([])
    setL4Units([])
    setSelectedL3('')
    setSelectedL4('')
    if (selectedL2) {
      loadChildren(selectedL2, setL3Units)
    }
  }, [selectedL2])

  // Effect: When L3 changes
  useEffect(() => {
    setL4Units([])
    setSelectedL4('')
    if (selectedL3) {
      loadChildren(selectedL3, setL4Units)
    }
  }, [selectedL3])

  // Notify Parent
  useEffect(() => {
    const finalUnitId = selectedL4 || selectedL3 || selectedL2
    const unitCode = finalUnitId ? finalUnitId.substring(0, 5) : ''

    onSelectionChange({
      l1: selectedL1,
      l2: selectedL2,
      l3: selectedL3,
      l4: selectedL4,
      finalUnitId,
      unitCode
    })
  }, [selectedL1, selectedL2, selectedL3, selectedL4])

  // Helper to map units to options
  const mapOptions = (units: OwnerUnit[]) => units.map(u => ({
    value: u.unit_id,
    label: `${u.unit_name} (${u.unit_id})`
  }))

  const l1Options = [
    { value: 'army', label: 'กองทัพบก (Royal Thai Army)' },
    { value: 'navy', label: 'กองทัพเรือ (Royal Thai Navy)' },
    { value: 'airforce', label: 'กองทัพอากาศ (Royal Thai Air Force)' }
  ]

  return (
    <div className={className}>
      {label && <h3 className="text-sm font-semibold text-github-fg-default mb-3 uppercase tracking-wider">{label}</h3>}
      <FormGroup>
        {/* L1 Selection */}
        <FormSelect
          name="l1_org"
          // label="Organization (L1)"
          label="หน่วยหลัก (Organization L1)"
          required
          value={selectedL1}
          onChange={(e) => setSelectedL1(e.target.value)}
          options={l1Options}
        />

        {/* L2 Selection */}
        {selectedL1 === 'navy' ? (
          <>
            <FormSelect
              name="l2_unit"
              // label="Unit / Department (L2)"
              label="หน่วยเจ้าของเรื่อง (Unit / Department L2)"
              required
              value={selectedL2}
              onChange={(e) => setSelectedL2(e.target.value)}
              options={mapOptions(l2Units)}
              placeholder="-- Select Unit --"
            />

            <FormSelect
              name="l3_unit"
              // label="Division (L3)"
              label="หน่วยผู้สร้างเอกสาร (Division L3)"
              value={selectedL3}
              onChange={(e) => setSelectedL3(e.target.value)}
              options={mapOptions(l3Units)}
              placeholder="-- Select Division (Optional) --"
              disabled={!selectedL2 || l3Units.length === 0}
            />

            <FormSelect
              name="l4_unit"
              // label="Section (L4)"
              label="หน่วยผู้สร้างเอกสาร (Section L4)"
              value={selectedL4}
              onChange={(e) => setSelectedL4(e.target.value)}
              options={mapOptions(l4Units)}
              placeholder="-- Select Section (Optional) --"
              disabled={!selectedL3 || l4Units.length === 0}
            />
          </>
        ) : (
          // Message for other orgs - High Visibility Version
          <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50 text-center">
            <p className="text-sm font-medium text-gray-900">No unit data available for this organization.</p>
            <p className="mt-1 text-xs text-gray-500">ระบุหน่วยงานนี้ยังไม่มีข้อมูลในระบบ</p>
          </div>
        )}
      </FormGroup>
    </div>
  )
}

export default UnitSelector
