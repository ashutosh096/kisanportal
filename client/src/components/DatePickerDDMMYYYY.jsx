import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

// Helper to convert ISO YYYY-MM-DD or timestamp to DD / MM / YYYY for visual display
const formatToDDMMYYYYDisplay = (isoStr) => {
  if (!isoStr) return '';
  const clean = String(isoStr).trim().split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD -> DD / MM / YYYY
      return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY -> DD / MM / YYYY
      return `${parts[0]} / ${parts[1]} / ${parts[2]}`;
    }
  }
  const slashParts = clean.split('/');
  if (slashParts.length === 3) {
    if (slashParts[0].length === 4) {
      // YYYY/MM/DD -> DD / MM / YYYY
      return `${slashParts[2]} / ${slashParts[1]} / ${slashParts[0]}`;
    } else if (slashParts[2].length === 4) {
      // DD/MM/YYYY -> DD / MM / YYYY
      return `${slashParts[0]} / ${slashParts[1]} / ${slashParts[2]}`;
    }
  }
  return clean;
};

// Helper to convert DD / MM / YYYY -> YYYY-MM-DD for standard ISO state
const formatToISO = (ddmmyyyyStr) => {
  if (!ddmmyyyyStr) return '';
  const clean = ddmmyyyyStr.replace(/\s+/g, '').replace(/\//g, '-');
  const parts = clean.split('-');
  if (parts.length === 3) {
    if (parts[0].length <= 2 && parts[2].length === 4) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  return ddmmyyyyStr;
};

const DatePickerDDMMYYYY = ({
  name,
  value,
  onChange,
  placeholder = 'DD / MM / YYYY',
  required = false,
  style = {},
  className = 'input-field',
}) => {
  const hiddenNativeRef = useRef(null);

  // Derived display value in DD / MM / YYYY
  const displayVal = formatToDDMMYYYYDisplay(value);

  const handleNativeChange = (e) => {
    const rawVal = e.target.value; // YYYY-MM-DD from native datepicker
    if (onChange) {
      onChange({
        target: {
          name: name || '',
          value: rawVal,
        },
      });
    }
  };

  const triggerNativePicker = () => {
    if (hiddenNativeRef.current) {
      if (typeof hiddenNativeRef.current.showPicker === 'function') {
        try {
          hiddenNativeRef.current.showPicker();
        } catch (err) {
          hiddenNativeRef.current.focus();
        }
      } else {
        hiddenNativeRef.current.focus();
        hiddenNativeRef.current.click();
      }
    }
  };

  // Safe ISO value for hidden input
  let isoForHidden = '';
  if (value) {
    const clean = String(value).split('T')[0].trim();
    if (clean.includes('-') && clean.split('-')[0].length === 4) {
      isoForHidden = clean;
    } else {
      isoForHidden = formatToISO(clean);
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
      <input
        type="text"
        name={name ? `${name}_display` : undefined}
        value={displayVal}
        placeholder={placeholder}
        required={required}
        readOnly
        onClick={triggerNativePicker}
        className={className}
        style={{
          width: '100%',
          paddingRight: '48px',
          cursor: 'pointer',
          fontWeight: 700,
          letterSpacing: '0.5px',
          ...style,
        }}
      />

      {/* Calendar Icon Button */}
      <button
        type="button"
        onClick={triggerNativePicker}
        style={{
          position: 'absolute',
          right: '12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#15803d',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Calendar size={20} />
      </button>

      {/* Hidden Native Date Input for Browser Calendar Picker */}
      <input
        ref={hiddenNativeRef}
        type="date"
        name={name}
        value={isoForHidden}
        onChange={handleNativeChange}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: 'none',
          bottom: 0,
          left: 0,
        }}
      />
    </div>
  );
};

export default DatePickerDDMMYYYY;
