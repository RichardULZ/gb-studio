/* eslint-disable react/no-multi-comp */
import React, { Component } from "react";
import PropTypes from "prop-types";
import { clipboard } from "electron";
import { connect } from "react-redux";
import cx from "classnames";
import uuid from "uuid/v4";
import { DragSource, DropTarget } from "react-dnd";
import { TriangleIcon } from "../library/Icons";
import AddCommandButton from "./AddCommandButton";
import { FormField } from "../library/Forms";
import ScriptEventBlock from "./ScriptEventBlock";
import {
  EVENT_END,
  EVENT_CALL_CUSTOM_EVENT,
  EVENT_COMMENT
} from "../../lib/compiler/eventTypes";
import {
  patchEvents,
  prependEvent,
  filterEvents,
  findEvent,
  appendEvent,
  regenerateEventIds
} from "../../lib/helpers/eventSystem";
import * as actions from "../../actions";
import { DropdownButton } from "../library/Button";
import { MenuItem, MenuDivider } from "../library/Menu";
import l10n from "../../lib/helpers/l10n";
import { SidebarHeading } from "../editors/Sidebar";
import { EventShape } from "../../reducers/stateShape";
import events from "../../lib/events";

const ItemTypes = {
  CARD: "card"
};

const cardSource = {
  beginDrag(props) {
    return {
      id: props.id,
      path: props.path
    };
  },

  canDrag(props) {
    return props.action.command !== "END";
  },

  endDrag(props, monitor) {
    const item = monitor.getItem();
    const target = monitor.getDropResult({ shallow: true });

    if (item && target) {
      props.moveActions(item.id, target.id);
    }
  }
};

const cardTarget = {
  canDrop(props, monitor) {
    return monitor.isOver({ shallow: true });
  },
  drop(props) {
    return {
      id: props.id,
      end: props.end
    };
  }
};

class ActionMini extends Component {
  constructor() {
    super();
    this.state = {
      rename: false,
      clipboardEvent: null
    };
  }

  toggleOpen = () => {
    const { id, action, onEdit } = this.props;
    onEdit(id, {
      __collapse: !action.args.__collapse
    });
  };

  toggleComment = () => {
    const { id, action, onEdit } = this.props;
    onEdit(id, {
      __comment: !action.args.__comment
    });
  };

  toggleElse = () => {
    const { id, action, onEdit } = this.props;
    onEdit(id, {
      __disableElse: !action.args.__disableElse
    });
  };

  toggleRename = () => {
    this.setState(prevState => {
      return {
        rename: !prevState.rename
      };
    });
  };

  submitOnEnter = e => {
    if (e.key === "Enter") {
      this.toggleRename();
    }
  };

  onPasteValues = e => {
    const { id, onEdit, action } = this.props;
    const { clipboardEvent } = this.state;
    if (!clipboardEvent || Array.isArray(clipboardEvent)) {
      // Can't paste values if copied entire script, or not copied anything
      return;
    }
    // Only include values from clipboard event that existed on current event already
    const newArgs = Object.keys(clipboardEvent.args || {}).reduce(
      (memo, key) => {
        if (action.args && action.args[key] !== undefined) {
          return {
            ...memo,
            [key]: clipboardEvent.args[key]
          };
        }
        return memo;
      },
      {}
    );
    onEdit(id, newArgs);
  };

  onPasteEvent = before => e => {
    const { id, onPaste } = this.props;
    const clipboardEvent = this.readClipboard();
    if (clipboardEvent) {
      onPaste(id, clipboardEvent, before);
    }
  };

  onEdit = (newValue, postUpdate) => {
    const { onEdit, action, id } = this.props;
    if (postUpdate) {
      return onEdit(
        id,
        postUpdate({
          ...action.args,
          ...newValue
        })
      );
    }
    onEdit(id, newValue);
  };

  onEditLabel = e => {
    const { onEdit, id } = this.props;
    onEdit(id, {
      __label: e.currentTarget.value
    });
  };

  readClipboard = e => {
    try {
      const clipboardData = JSON.parse(clipboard.readText());
      if (clipboardData.__type === "event") {
        this.setState({ clipboardEvent: clipboardData });
        return clipboardData;
      }
      if (clipboardData.__type === "script") {
        this.setState({ clipboardEvent: clipboardData.script });
        return clipboardData.script;
      }
      this.setState({ clipboardEvent: null });
      return null;
    } catch (err) {
      this.setState({ clipboardEvent: null });
      return null;
    }
  };

  editCustomEvent = e => {
    const { onSelectCustomEvent, action } = this.props;
    if (action.args.customEventId) {
      onSelectCustomEvent(action.args.customEventId);
    }
  };

  render() {
    const {
      id,
      entityId,
      type,
      action,
      connectDragSource,
      connectDragPreview,
      connectDropTarget,
      isDragging,
      isOverCurrent,
      moveActions,
      onAdd,
      onEdit,
      onRemove,
      onCopy,
      onPaste,
      onSelectCustomEvent,
      onMouseEnter,
      onMouseLeave
    } = this.props;
    const { rename, clipboardEvent } = this.state;
    const { command } = action;

    if (command === EVENT_END) {
      return connectDropTarget(
        <div
          className={cx("ActionMini", "ActionMini--Add", {
            "ActionMini--Dragging": isDragging,
            "ActionMini--Over": isOverCurrent
          })}
        >
          <AddCommandButton
            onAdd={onAdd(id)}
            onPaste={this.onPasteEvent(true)}
            type={type}
          />
        </div>
      );
    }

    const open = action.args && !action.args.__collapse;
    const childKeys = action.children ? Object.keys(action.children) : [];
    const isComment = command === EVENT_COMMENT;
    const commented = action.args && action.args.__comment;
    const hasElse = action.children && action.children.false;
    const disabledElse = action.args && action.args.__disableElse;

    const eventName =
      action.args.__name ||
      l10n(command) ||
      (events[command] && events[command].name) ||
      command;

    const labelName = action.args.__label
      ? action.args.__label
      : isComment && action.args.text;

    const hoverName = labelName || eventName;

    return connectDropTarget(
      connectDragPreview(
        <div
          className={cx("ActionMini", {
            "ActionMini--Dragging": isDragging,
            "ActionMini--Over": isOverCurrent,
            "ActionMini--Conditional":
              childKeys.length > 0 && command !== EVENT_CALL_CUSTOM_EVENT,
            "ActionMini--Commented": commented
          })}
        >
          <div
            className="ActionMini__Content"
            onMouseEnter={() => onMouseEnter(id)}
            onMouseLeave={() => onMouseLeave(id)}
          >
            {connectDragSource(
              <div
                className={cx("ActionMini__Command", {
                  "ActionMini__Command--Open": open,
                  EventComment: isComment || commented
                })}
                onClick={this.toggleOpen}
              >
                <TriangleIcon />{" "}
                {commented || isComment ? <span>// </span> : ""}
                {labelName ? (
                  <span>
                    {labelName}
                    <small>{eventName}</small>
                  </span>
                ) : (
                  <span>{eventName}</span>
                )}
              </div>
            )}

            <div className="ActionMini__Dropdown">
              <DropdownButton
                small
                transparent
                right
                onMouseDown={this.readClipboard}
              >
                {command === EVENT_CALL_CUSTOM_EVENT && [
                  <MenuItem key="0" onClick={this.editCustomEvent}>
                    {l10n("MENU_EDIT_CUSTOM_EVENT")}
                  </MenuItem>,
                  <MenuDivider key="1" />
                ]}
                <MenuItem onClick={this.toggleRename}>
                  {l10n("MENU_RENAME_EVENT")}
                </MenuItem>
                <MenuItem onClick={this.toggleComment}>
                  {commented
                    ? l10n("MENU_REENABLE_EVENT")
                    : l10n("MENU_DISABLE_EVENT")}
                </MenuItem>
                {hasElse && (
                  <MenuItem onClick={this.toggleElse}>
                    {disabledElse
                      ? l10n("MENU_REENABLE_ELSE")
                      : l10n("MENU_DISABLE_ELSE")}
                  </MenuItem>
                )}
                <MenuDivider />
                <MenuItem onClick={onCopy(action)}>
                  {l10n("MENU_COPY_EVENT")}
                </MenuItem>
                {clipboardEvent && !Array.isArray(clipboardEvent) && (
                  <MenuDivider />
                )}
                {clipboardEvent && !Array.isArray(clipboardEvent) && (
                  <MenuItem onClick={this.onPasteValues}>
                    {l10n("MENU_PASTE_VALUES")}
                  </MenuItem>
                )}
                {clipboardEvent && (
                  <MenuItem onClick={this.onPasteEvent(true)}>
                    {l10n("MENU_PASTE_EVENT_BEFORE")}
                  </MenuItem>
                )}
                {clipboardEvent && (
                  <MenuItem onClick={this.onPasteEvent(false)}>
                    {l10n("MENU_PASTE_EVENT_AFTER")}
                  </MenuItem>
                )}
                <MenuDivider />
                <MenuItem onClick={onRemove(id)}>
                  {l10n("MENU_DELETE_EVENT")}
                </MenuItem>
              </DropdownButton>
            </div>

            {rename && (
              <div className="ActionMini__Rename">
                <FormField>
                  <div style={{ display: "flex" }}>
                    <input
                      placeholder={l10n("FIELD_LABEL")}
                      value={action.args.__label || ""}
                      autoFocus
                      onBlur={this.toggleRename}
                      onChange={this.onEditLabel}
                      onKeyDown={this.submitOnEnter}
                    />
                    <div className="SelectRenamable__EditBtn SelectRenamable__SaveBtn">
                      {l10n("FIELD_SAVE")}
                    </div>
                  </div>
                </FormField>
              </div>
            )}

            {open && events[command] && events[command].fields && (
              <ScriptEventBlock
                id={action.id}
                entityId={entityId}
                command={command}
                value={action.args}
                onChange={this.onEdit}
                renderEvents={key => (
                  <div className="ActionMini__Children" key={key}>
                    {(
                      action.children[key] || [
                        {
                          id: uuid(),
                          command: EVENT_END
                        }
                      ]
                    ).map(childAction => (
                      <ActionMiniDnD
                        key={childAction.id}
                        id={childAction.id}
                        entityId={entityId}
                        type={type}
                        path={`${id}_true_${childAction.id}`}
                        action={childAction}
                        moveActions={moveActions}
                        onAdd={onAdd}
                        onRemove={onRemove}
                        onEdit={onEdit}
                        onCopy={onCopy}
                        onPaste={onPaste}
                        onSelectCustomEvent={onSelectCustomEvent}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        clipboardEvent={clipboardEvent}
                      />
                    ))}
                    <div
                      className="ActionMini__ChildrenBorder"
                      title={hoverName}
                    />
                  </div>
                )}
              />
            )}

            {/* {open &&
              childKeys.length > 0 &&
              command !== EVENT_CALL_CUSTOM_EVENT &&
              connectDropTarget(
                <div className="ActionMini__Children">
                  {action.children[childKeys[0]].map(childAction => (
                    <ActionMiniDnD
                      key={childAction.id}
                      id={childAction.id}
                      type={type}
                      path={`${id}_true_${childAction.id}`}
                      action={childAction}
                      moveActions={moveActions}
                      onAdd={onAdd}
                      onRemove={onRemove}
                      onEdit={onEdit}
                      onCopy={onCopy}
                      onPaste={onPaste}
                      onMouseEnter={onMouseEnter}
                      onMouseLeave={onMouseLeave}
                      clipboardEvent={clipboardEvent}
                    />
                  ))}
                  <div
                    className="ActionMini__ChildrenBorder"
                    title={eventName}
                  />
                </div>
              )} */}

            {/* {childKeys.length > 1 &&
              childKeys.map((key, index) => {
                if (index === 0) {
                  return [];
                }
                return [
                  <div
                    key={`child_${key}_header`}
                    className={cx("ActionMini__Else", {
                      "ActionMini__Else--Open": elseOpen
                    })}
                    onClick={this.toggleElseOpen}
                  >
                    <TriangleIcon /> {commented ? "// " : ""} Else
                  </div>,
                  elseOpen && (
                    <div
                      key={`child_${key}_body`}
                      className="ActionMini__Children"
                    >
                      {action.children[key].map(childAction => (
                        <ActionMiniDnD
                          key={childAction.id}
                          id={childAction.id}
                          type={type}
                          path={`${id}_true_${childAction.id}`}
                          action={childAction}
                          moveActions={moveActions}
                          onAdd={onAdd}
                          onRemove={onRemove}
                          onEdit={onEdit}
                          onCopy={onCopy}
                          onPaste={onPaste}
                          onMouseEnter={onMouseEnter}
                          onMouseLeave={onMouseLeave}
                          clipboardEvent={clipboardEvent}
                        />
                      ))}
                      <div
                        className="ActionMini__ChildrenBorder"
                        title={elseName}
                      />
                    </div>
                  )
                ];
              })} */}
          </div>
        </div>
      )
    );
  }
}

ActionMini.propTypes = {
  id: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  action: EventShape.isRequired,
  isDragging: PropTypes.bool.isRequired,
  isOverCurrent: PropTypes.bool.isRequired,
  onAdd: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  onPaste: PropTypes.func.isRequired,
  onSelectCustomEvent: PropTypes.func.isRequired,
  moveActions: PropTypes.func.isRequired,
  onMouseLeave: PropTypes.func.isRequired,
  onMouseEnter: PropTypes.func.isRequired,
  connectDragSource: PropTypes.func.isRequired,
  connectDragPreview: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired
};

const ActionMiniDnD = DropTarget(
  ItemTypes.CARD,
  cardTarget,
  (dndConnect, monitor) => ({
    connectDropTarget: dndConnect.dropTarget(),
    isOver: monitor.isOver(),
    isOverCurrent: monitor.isOver({ shallow: true })
  })
)(
  DragSource(ItemTypes.CARD, cardSource, (dndConnect, monitor) => ({
    connectDragSource: dndConnect.dragSource(),
    connectDragPreview: dndConnect.dragPreview(),
    isDragging: monitor.isDragging()
  }))(ActionMini)
);

class ScriptEditor extends Component {
  constructor() {
    super();
    this.state = {
      clipboardEvent: null
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    const { value } = this.props;
    const { clipboardEvent } = this.state;
    return (
      nextProps.value !== value || nextState.clipboardEvent !== clipboardEvent
    );
  }

  onChange = newValue => {
    const { onChange } = this.props;
    onChange(newValue);
  };

  moveActions = (a, b) => {
    const { value: root } = this.props;
    if (a === b) {
      return;
    }
    const input = prependEvent(filterEvents(root, a), b, findEvent(root, a));
    this.onChange(input);
  };

  onAdd = id => (command, defaults = {}, defaultChildren = {}) => {
    const { musicIds, sceneIds, actorIds, spriteSheetIds, scope } = this.props;
    const { value: root } = this.props;
    const eventFields = events[command].fields;
    const defaultArgs = eventFields
      ? eventFields.reduce(
          (memo, field) => {
            let replaceValue = null;
            if (field.defaultValue === "LAST_SCENE") {
              replaceValue = sceneIds[sceneIds.length - 1];
            } else if (field.defaultValue === "LAST_VARIABLE") {
              replaceValue = scope === "customEvents" ? "0" : "L0";
            } else if (field.defaultValue === "LAST_MUSIC") {
              replaceValue = musicIds[0];
            } else if (field.defaultValue === "LAST_SPRITE") {
              replaceValue = spriteSheetIds[0];
            } else if (field.defaultValue === "LAST_ACTOR") {
              replaceValue =
                actorIds.length > 0 ? actorIds[actorIds.length - 1] : "player";
            } else if (field.type === "events") {
              replaceValue = undefined;
            } else if (
              field.defaultValue !== undefined &&
              !defaults[field.key]
            ) {
              replaceValue = field.defaultValue;
            }
            if (replaceValue !== null) {
              return {
                ...memo,
                [field.key]: replaceValue
              };
            }
            return memo;
          },
          { ...defaults }
        )
      : { ...defaults };

    const childFields = eventFields.filter(field => field.type === "events");
    const children = childFields.reduce((memo, field) => {
      const childScript = defaultChildren[field.key]
        ? defaultChildren[field.key]
        : [
            {
              id: uuid(),
              command: EVENT_END
            }
          ];
      return {
        ...memo,
        [field.key]: childScript
      };
    }, {});

    const input = prependEvent(
      root,
      id,
      Object.assign(
        {
          id: uuid(),
          command,
          args: defaultArgs
        },
        childFields.length > 0 && {
          children
        }
      )
    );
    this.onChange(input);
  };

  onRemove = id => () => {
    const { value } = this.props;
    const input = filterEvents(value, id);
    this.onChange(input);
  };

  onEdit = (id, patch) => {
    const { value } = this.props;
    const input = patchEvents(value, id, patch);
    this.onChange(input);
  };

  onCopy = event => () => {
    const { copyEvent } = this.props;
    copyEvent(event);
  };

  onCopyScript = () => {
    const { copyScript } = this.props;
    const { value } = this.props;
    copyScript(value);
  };

  onPaste = (id, event, before) => {
    const { value } = this.props;
    const newEvent = Array.isArray(event)
      ? event.slice(0, -1).map(regenerateEventIds)
      : regenerateEventIds(event);
    const input = before
      ? prependEvent(value, id, newEvent)
      : appendEvent(value, id, newEvent);
    this.onChange(input);
  };

  onRemoveScript = e => {
    this.onChange([
      {
        id: uuid(),
        command: EVENT_END
      }
    ]);
  };

  onReplaceScript = e => {
    const { clipboardEvent } = this.state;
    if (clipboardEvent) {
      this.onChange(
        []
          .concat(
            clipboardEvent,
            !Array.isArray(clipboardEvent)
              ? {
                  id: uuid(),
                  command: EVENT_END
                }
              : []
          )
          .map(regenerateEventIds)
      );
    }
  };

  onPasteScript = before => () => {
    const { clipboardEvent } = this.state;
    const { value } = this.props;
    const newEvent = Array.isArray(clipboardEvent)
      ? clipboardEvent.slice(0, -1).map(regenerateEventIds)
      : regenerateEventIds(clipboardEvent);
    if (clipboardEvent) {
      if (before) {
        this.onChange([].concat(newEvent, value));
      } else {
        this.onChange([].concat(value.slice(0, -1), newEvent, value.slice(-1)));
      }
    }
  };

  onEnter = id => {
    const { selectScriptEvent } = this.props;
    selectScriptEvent(id);
  };

  onLeave = id => {
    const { selectScriptEvent } = this.props;
    selectScriptEvent("");
  };

  onSelectCustomEvent = id => {
    const { selectCustomEvent } = this.props;
    selectCustomEvent(id);
  };

  readClipboard = e => {
    try {
      const clipboardData = JSON.parse(clipboard.readText());
      if (clipboardData.__type === "event") {
        this.setState({ clipboardEvent: clipboardData });
      } else if (clipboardData.__type === "script") {
        this.setState({ clipboardEvent: clipboardData.script });
      } else {
        this.setState({ clipboardEvent: null });
      }
    } catch (err) {
      this.setState({ clipboardEvent: null });
    }
  };

  render() {
    const { type, title, value, entityId, renderHeader } = this.props;
    const { clipboardEvent } = this.state;

    const buttons = (
      <DropdownButton small transparent right onMouseDown={this.readClipboard}>
        <MenuItem onClick={this.onCopyScript}>
          {l10n("MENU_COPY_SCRIPT")}
        </MenuItem>
        {clipboardEvent && <MenuDivider />}
        {clipboardEvent && (
          <MenuItem onClick={this.onReplaceScript}>
            {l10n("MENU_REPLACE_SCRIPT")}
          </MenuItem>
        )}
        {clipboardEvent && value && value.length > 1 && (
          <MenuItem onClick={this.onPasteScript(true)}>
            {l10n("MENU_PASTE_SCRIPT_BEFORE")}
          </MenuItem>
        )}
        {clipboardEvent && value && value.length > 1 && (
          <MenuItem onClick={this.onPasteScript(false)}>
            {l10n("MENU_PASTE_SCRIPT_AFTER")}
          </MenuItem>
        )}
        <MenuDivider />
        <MenuItem onClick={this.onRemoveScript}>
          {l10n("MENU_DELETE_SCRIPT")}
        </MenuItem>
      </DropdownButton>
    );

    const heading = renderHeader ? (
      renderHeader({ buttons })
    ) : (
      <SidebarHeading title={title} buttons={buttons} />
    );

    return (
      <div>
        {heading}
        <div className="ScriptEditor">
          {value.map(action => (
            <ActionMiniDnD
              key={action.id}
              id={action.id}
              entityId={entityId}
              type={type}
              action={action}
              moveActions={this.moveActions}
              onAdd={this.onAdd}
              onRemove={this.onRemove}
              onEdit={this.onEdit}
              onCopy={this.onCopy}
              onPaste={this.onPaste}
              onSelectCustomEvent={this.onSelectCustomEvent}
              onMouseEnter={this.onEnter}
              onMouseLeave={this.onLeave}
              clipboardEvent={clipboardEvent}
            />
          ))}
        </div>
      </div>
    );
  }
}

ScriptEditor.propTypes = {
  title: PropTypes.string,
  type: PropTypes.string.isRequired,
  value: PropTypes.arrayOf(PropTypes.shape({})),
  onChange: PropTypes.func.isRequired,
  musicIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  sceneIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  actorIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  spriteSheetIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectScriptEvent: PropTypes.func.isRequired,
  copyEvent: PropTypes.func.isRequired,
  copyScript: PropTypes.func.isRequired,
  selectCustomEvent: PropTypes.func.isRequired,
  entityId: PropTypes.string.isRequired,
  scope: PropTypes.string.isRequired,
  renderHeader: PropTypes.func
};

ScriptEditor.defaultProps = Object.create(
  {
    title: ""
  },
  {
    value: {
      enumerable: true,
      get: () => [
        {
          id: uuid(),
          command: EVENT_END
        }
      ]
    }
  }
);

function mapStateToProps(state, props) {
  const { result, entities } = state.entities.present;
  const { type: scope } = state.editor;
  return {
    sceneIds: result.scenes,
    actorIds: props.actors || entities.scenes[state.editor.scene].actors,
    musicIds: result.music,
    spriteSheetIds: result.spriteSheets,
    value: props.value && props.value.length > 0 ? props.value : undefined,
    scope
  };
}

const mapDispatchToProps = {
  selectScriptEvent: actions.selectScriptEvent,
  copyEvent: actions.copyEvent,
  copyScript: actions.copyScript,
  selectCustomEvent: actions.selectCustomEvent
};

export default connect(mapStateToProps, mapDispatchToProps)(ScriptEditor);
