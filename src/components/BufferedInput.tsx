import React, { useState, useEffect, useRef } from "react";

// Standard ChangeEvent simulated target
interface SimulatedEvent<T> {
  target: {
    value: string;
    id: string;
    name?: string;
  };
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

interface BufferedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange?: (e: SimulatedEvent<HTMLInputElement>) => void;
}

export const BufferedInput: React.FC<BufferedInputProps> = ({
  value,
  onChange,
  id,
  name,
  ...props
}) => {
  const [localVal, setLocalVal] = useState<string>((value as string) || "");
  const [isFocused, setIsFocused] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Sync to localVal only if NOT focused to prevent background re-renders from erasing typing state
  useEffect(() => {
    if (value !== undefined && !isFocused) {
      setLocalVal((value as string) || "");
    }
  }, [value, isFocused]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync to parent on delay with 50ms stable debounce window to guarantee zero typing lag
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentParentVal = (valueRef.current as string) || "";
      if (localVal !== currentParentVal && onChangeRef.current) {
        onChangeRef.current({
          target: {
            value: localVal,
            id: id || "",
            name: name || "",
          },
        });
      }
    }, 50); 
    return () => clearTimeout(timer);
  }, [localVal, id, name]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const currentParentVal = (valueRef.current as string) || "";
    if (localVal !== currentParentVal && onChangeRef.current) {
      onChangeRef.current({
        target: {
          value: localVal,
          id: id || "",
          name: name || "",
        },
      });
    }
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <input
      {...props}
      id={id}
      name={name}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
};

interface BufferedTextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  onChange?: (e: SimulatedEvent<HTMLTextAreaElement>) => void;
}

export const BufferedTextArea: React.FC<BufferedTextAreaProps> = ({
  value,
  onChange,
  id,
  name,
  ...props
}) => {
  const [localVal, setLocalVal] = useState<string>((value as string) || "");
  const [isFocused, setIsFocused] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (value !== undefined && !isFocused) {
      setLocalVal((value as string) || "");
    }
  }, [value, isFocused]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentParentVal = (valueRef.current as string) || "";
      if (localVal !== currentParentVal && onChangeRef.current) {
        onChangeRef.current({
          target: {
            value: localVal,
            id: id || "",
            name: name || "",
          },
        });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [localVal, id, name]);

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    const currentParentVal = (valueRef.current as string) || "";
    if (localVal !== currentParentVal && onChangeRef.current) {
      onChangeRef.current({
        target: {
          value: localVal,
          id: id || "",
          name: name || "",
        },
      });
    }
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <textarea
      {...props}
      id={id}
      name={name}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
};
