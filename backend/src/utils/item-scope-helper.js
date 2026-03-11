export const parseItemScope = (selectionType, sectionId, classIds) => {
  let scope,
    finalSectionId,
    finalClassIds = [];

  switch (selectionType) {
    case "all-sections":
      scope = "global";
      break;
    case "specific-all-classes":
      scope = "section";
      if (!sectionId) throw new Error("Section ID required");
      finalSectionId = sectionId;
      break;
    case "section-specific-classes":
      scope = "class";
      if (!sectionId) throw new Error("Section ID required");
      if (!classIds?.length) throw new Error("At least one class ID required");
      finalSectionId = sectionId;
      finalClassIds = classIds;
      break;
    default:
      throw new Error("Invalid selection type");
  }

  return { scope, sectionId: finalSectionId, classIds: finalClassIds };
};
