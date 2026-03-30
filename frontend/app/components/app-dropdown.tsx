import * as React from "react";
import { 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Checkbox, 
  ListItemText,
  ListSubheader,
  type SelectChangeEvent 
} from "@mui/material";

interface DropdownOption {
  value: string | number;
  label: string;
  category?: string;
}

interface AppDropdownProps {
  label: string;
  value: any;
  onChange: (event: SelectChangeEvent<any>) => void;
  options: DropdownOption[];
  multiple?: boolean;
  checkbox?: boolean;
  minWidth?: number | string;
  placeholder?: string;
  renderValue?: (selected: any) => React.ReactNode;
}

export default function AppDropdown({
  label,
  value,
  onChange,
  options,
  multiple = false,
  checkbox = false,
  minWidth = 180,
  placeholder,
  renderValue
}: AppDropdownProps) {
  
  // Group options by category if they exist
  const hasCategories = options.some(opt => !!opt.category);
  
  const renderMenuItems = () => {
    if (!hasCategories) {
      return options.map((opt) => (
        <MenuItem key={opt.value} value={opt.value} sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
          {multiple && checkbox && <Checkbox size="small" checked={value.indexOf(opt.value) > -1} sx={{ p: 0.5 }} />}
          <ListItemText primary={opt.label} primaryTypographyProps={{ sx: { fontWeight: 'bold', fontSize: '0.75rem' } }} />
        </MenuItem>
      ));
    }

    // Sort/Group by category
    const grouped: Record<string, DropdownOption[]> = {};
    options.forEach(opt => {
      const cat = opt.category || "General";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(opt);
    });

    return Object.entries(grouped).flatMap(([cat, items]) => [
      <ListSubheader key={`header-${cat}`} sx={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.1em', color: '#00599c', lineHeight: '24px', backgroundColor: '#f1f5f9' }}>
        {cat}
      </ListSubheader>,
      ...items.map((opt) => (
        <MenuItem key={opt.value} value={opt.value} sx={{ fontWeight: 'bold', fontSize: '0.75rem', pl: 3 }}>
          {multiple && checkbox && <Checkbox size="small" checked={value.indexOf(opt.value) > -1} sx={{ p: 0.5 }} />}
          <ListItemText primary={opt.label} primaryTypographyProps={{ sx: { fontWeight: 'bold', fontSize: '0.75rem' } }} />
        </MenuItem>
      ))
    ]);
  };

  return (
    <FormControl size="small" sx={{ minWidth }}>
      <InputLabel 
        shrink 
        sx={{ 
          color: '#64748b', 
          fontWeight: '900', 
          fontSize: '0.6rem', 
          textTransform: 'uppercase', 
          letterSpacing: '0.15em',
          position: 'relative',
          transform: 'none',
          mb: 0.5,
          ml: 1
        }}
      >
        {label}
      </InputLabel>
      <Select
        multiple={multiple}
        value={value}
        onChange={onChange}
        displayEmpty={!!placeholder}
        renderValue={renderValue || (multiple ? (selected) => {
          if (!selected || (Array.isArray(selected) && selected.length === 0)) {
            return <em style={{ fontStyle: 'normal', color: '#94a3b8' }}>{placeholder || "Select"}</em>;
          }
          const labels = (selected as any[]).map(val => options.find(o => o.value === val)?.label || val);
          return labels.join(', ');
        } : (selected) => {
          if (selected === "" || selected === undefined) {
            return <em style={{ fontStyle: 'normal', color: '#94a3b8' }}>{placeholder || "Select"}</em>;
          }
          return options.find(o => o.value === selected)?.label || selected;
        })}
        sx={{
          borderRadius: '12px',
          backgroundColor: '#f8fafc',
          border: '2px solid #e2e8f0',
          transition: 'all 0.2s',
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          '& .MuiSelect-select': { 
            fontWeight: 'bold', 
            color: '#0f172a', 
            fontSize: '0.75rem',
            paddingTop: '8px',
            paddingBottom: '8px',
            minHeight: '20px',
            display: 'flex',
            alignItems: 'center'
          },
          '&:hover': {
            borderColor: '#cbd5e1',
            backgroundColor: 'white'
          },
          '&.Mui-focused': {
            borderColor: '#00599c',
            backgroundColor: 'white'
          }
        }}
        MenuProps={{
          disableScrollLock: true,
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
          PaperProps: {
            sx: {
              borderRadius: '16px',
              mt: 1,
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              border: '1px solid #f1f5f9',
              maxHeight: 400
            }
          }
        }}
      >
        {placeholder && !multiple && (
          <MenuItem disabled value="">
            <em style={{ fontStyle: 'normal', color: '#94a3b8' }}>{placeholder}</em>
          </MenuItem>
        )}
        {renderMenuItems()}
      </Select>
    </FormControl>
  );
}
