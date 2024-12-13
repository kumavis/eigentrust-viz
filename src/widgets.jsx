export const Slider = ({ value, setValue, step = 1 }) => {
  const handleChange = (event) => {
    setValue(parseFloat(event.target.value));
  };

  return (
    <input
      type="range"
      min="0"
      max="1"
      step={step}
      value={value}
      onChange={handleChange}
      style={{ width: "100%" }}
    />
  );
};