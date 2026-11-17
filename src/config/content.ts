/** Shared editorial content used on more than one page. */
export const howItWorksSteps = [
  {
    title: "Choose a starting design",
    body: "Each piece comes in a few worked-out arrangements. Pick the one closest to what you need.",
  },
  {
    title: "Set the size and layout",
    body: "Adjust the width in fixed steps and decide which bays are open, doored or fitted with drawers. Only combinations that can be built are offered.",
  },
  {
    title: "Pick the finish and details",
    body: "Choose a finish, legs or a plinth, and handles. The drawing and the price update as you go.",
  },
  {
    title: "Receive it flat-packed and assemble",
    body: "Your order arrives as labeled parts with the hardware and a guide matched to your layout.",
  },
] as const;

export const faqs = [
  {
    q: "Can I order yet?",
    a: "Not yet. This is a preview of the catalog. The configurator and checkout are still being built.",
  },
  {
    q: "Can I get a custom size?",
    a: "Widths can be changed in fixed steps within each design's range, shown on its product page. Sizes outside those ranges are not offered.",
  },
  {
    q: "Can I add to a piece later?",
    a: "That is the idea behind the range: pieces are built from shared panels, shelves, doors and drawer boxes, so bays can be added. Exactly which additions are supported will be listed per product when ordering opens.",
  },
  {
    q: "How much is shipping, and how long does delivery take?",
    a: "Shipping costs and delivery times have not been set. They will be shown before you pay.",
  },
  {
    q: "Do I need tools?",
    a: "Tool requirements will be listed in each product's assembly guide once the guides are finalized.",
  },
] as const;
