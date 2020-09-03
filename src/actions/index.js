import uuid from "uuid/v4";
import Path from "path";
import * as types from "./actionTypes";
import loadProjectData from "../lib/project/loadProjectData";
import saveProjectData from "../lib/project/saveProjectData";
import saveAsProjectData from "../lib/project/saveAsProjectData";
import { loadSpriteData } from "../lib/project/loadSpriteData";
import { loadBackgroundData } from "../lib/project/loadBackgroundData";
import { loadMusicData } from "../lib/project/loadMusicData";
import { denormalizeProject } from "../reducers/entitiesReducer";
import parseAssetPath from "../lib/helpers/path/parseAssetPath";

const asyncAction = async (
  dispatch,
  requestType,
  successType,
  failureType,
  fn
) => {
  dispatch({ type: requestType });
  try {
    const res = await fn();
    dispatch({ ...res, type: successType });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    dispatch({ type: failureType });
  }
};

export const loadSprite = filename => async (dispatch, getState) => {
  return asyncAction(
    dispatch,
    types.SPRITE_LOAD_REQUEST,
    types.SPRITE_LOAD_SUCCESS,
    types.SPRITE_LOAD_FAILURE,
    async () => {
      const state = getState();
      const projectRoot = state.document && state.document.root;
      const data = await loadSpriteData(projectRoot)(filename);
      return {
        data
      };
    }
  );
};

export const removeSprite = filename => async (dispatch, getState) => {
  const state = getState();
  const projectRoot = state.document && state.document.root;
  const { file, plugin } = parseAssetPath(filename, projectRoot, "sprites");

  return dispatch({
    type: types.SPRITE_REMOVE,
    data: {
      filename: file,
      plugin
    }
  });
};

export const loadBackground = filename => async (dispatch, getState) => {
  return asyncAction(
    dispatch,
    types.BACKGROUND_LOAD_REQUEST,
    types.BACKGROUND_LOAD_SUCCESS,
    types.BACKGROUND_LOAD_FAILURE,
    async () => {
      const state = getState();
      const projectRoot = state.document && state.document.root;
      const data = await loadBackgroundData(projectRoot)(filename);
      return {
        data
      };
    }
  );
};

export const removeBackground = filename => async (dispatch, getState) => {
  const state = getState();
  const projectRoot = state.document && state.document.root;
  const { file, plugin } = parseAssetPath(filename, projectRoot, "backgrounds");

  return dispatch({
    type: types.BACKGROUND_REMOVE,
    data: {
      filename: file,
      plugin
    }
  });
};

export const loadMusic = filename => async (dispatch, getState) => {
  return asyncAction(
    dispatch,
    types.MUSIC_LOAD_REQUEST,
    types.MUSIC_LOAD_SUCCESS,
    types.MUSIC_LOAD_FAILURE,
    async () => {
      const state = getState();
      const projectRoot = state.document && state.document.root;
      const data = await loadMusicData(projectRoot)(filename);
      return {
        data
      };
    }
  );
};

export const removeMusic = filename => async (dispatch, getState) => {
  const state = getState();
  const projectRoot = state.document && state.document.root;
  const { file, plugin } = parseAssetPath(filename, projectRoot, "music");

  return dispatch({
    type: types.MUSIC_REMOVE,
    data: {
      filename: file,
      plugin
    }
  });
};

export const saveProject = () => async (dispatch, getState) => {
  const state = getState();
  if (
    !state.document.loaded ||
    state.document.saving ||
    !state.document.modified
  ) {
    return;
  }
  await asyncAction(
    dispatch,
    types.PROJECT_SAVE_REQUEST,
    types.PROJECT_SAVE_SUCCESS,
    types.PROJECT_SAVE_FAILURE,
    async () => {
      const data = denormalizeProject(state.entities.present);
      data.settings.zoom = state.editor.zoom;
      data.settings.worldScrollX = state.editor.worldScrollX;
      data.settings.worldScrollY = state.editor.worldScrollY;
      await saveProjectData(state.document.path, data);
    }
  );
};

export const saveAsProjectAction = path => async (dispatch, getState) => {
  const state = getState();
  if (
      !state.document.loaded ||
      state.document.saving
  ) {
    return;
  }
  await asyncAction(
      dispatch,
      types.PROJECT_SAVE_AS_REQUEST,
      types.PROJECT_SAVE_AS_SUCCESS,
      types.PROJECT_SAVE_AS_FAILURE,
      async () => {
        const saveData = denormalizeProject(state.entities.present);
        saveData.settings.zoom = state.editor.zoom;
        saveData.name = Path.parse(path).name;
        await saveAsProjectData(state.document.path, path, saveData);
        const data = await loadProjectData(path);
        return {
          data,
          path
        }
      }
  );
};

export const setActorPrefab = actor => {
  return { type: types.SET_ACTOR_PREFAB, actor };
};

export const setTriggerPrefab = trigger => {
  return { type: types.SET_TRIGGER_PREFAB, trigger };
};

export const setScenePrefab = scene => {
  return { type: types.SET_SCENE_PREFAB, scene };
};

export const removeScene = sceneId => {
  return { type: types.REMOVE_SCENE, sceneId };
};

export const addActor = (sceneId, x, y, defaults) => {
  return { type: types.ADD_ACTOR, sceneId, x, y, id: uuid(), defaults };
};

export const selectActor = (sceneId, id) => {
  return { type: types.SELECT_ACTOR, sceneId, id };
};

export const removeActor = (sceneId, id) => {
  return { type: types.REMOVE_ACTOR, sceneId, id };
};

export const removeActorAt = (sceneId, x, y) => {
  return { type: types.REMOVE_ACTOR_AT, sceneId, x, y };
};

export const selectScriptEvent = eventId => {
  return { type: types.SELECT_SCRIPT_EVENT, eventId };
};

export const removeTriggerAt = (sceneId, x, y) => {
  return { type: types.REMOVE_TRIGGER_AT, sceneId, x, y };
};

export const resizeTrigger = (sceneId, id, startX, startY, x, y) => {
  return { type: types.RESIZE_TRIGGER, sceneId, id, startX, startY, x, y };
};

export const moveTrigger = (sceneId, id, newSceneId, x, y) => {
  return { type: types.MOVE_TRIGGER, sceneId, id, newSceneId, x, y };
};

export const editTrigger = (sceneId, id, values) => {
  return { type: types.EDIT_TRIGGER, sceneId, id, values };
};

export const removeCustomEvent = customEventId => {
  return { type: types.REMOVE_CUSTOM_EVENT, customEventId };
};

export const copyEvent = event => {
  return { type: types.COPY_EVENT, event };
};

export const copyScript = script => {
  return { type: types.COPY_SCRIPT, script };
};

export const copyActor = actor => {
  return { type: types.COPY_ACTOR, actor };
};

export const copyTrigger = trigger => {
  return { type: types.COPY_TRIGGER, trigger };
};

export const copyScene = scene => {
  return { type: types.COPY_SCENE, scene };
};

export const copySelectedEntity = () => (dispatch, getState) => {
  const state = getState();
  const { scene: sceneId, entityId, type: editorType } = state.editor;
  if (editorType === "scenes") {
    dispatch(copyScene(state.entities.present.entities.scenes[sceneId]));
  } else if (editorType === "actors") {
    dispatch(copyActor(state.entities.present.entities.actors[entityId]));
  } else if (editorType === "triggers") {
    dispatch(copyTrigger(state.entities.present.entities.triggers[entityId]));
  }
};

export const pasteClipboardEntity = clipboardData => dispatch => {
  if (clipboardData.__type === "scene") {
    const clipboardScene = clipboardData.scene;
    dispatch(pasteCustomEvents());    
    dispatch(setScenePrefab(clipboardScene));
  } else if (clipboardData.__type === "actor") {
    const clipboardActor = clipboardData.actor;
    dispatch(pasteCustomEvents());    
    dispatch(setActorPrefab(clipboardActor));
  } else if (clipboardData.__type === "trigger") {
    const clipboardTrigger = clipboardData.trigger;
    dispatch(pasteCustomEvents());
    dispatch(setTriggerPrefab(clipboardTrigger));
  }
};

export const pasteClipboardEntityInPlace = (clipboardData) => (dispatch, getState) => {
  const state = getState();
  const { scene: sceneId } = state.editor;
  if (clipboardData.__type === "scene") {
    const clipboardScene = clipboardData.scene;
    dispatch(pasteCustomEvents());
    dispatch(addScene(clipboardScene.x, clipboardScene.y, clipboardScene));
  } else if (sceneId && clipboardData.__type === "actor") {
    const clipboardActor = clipboardData.actor;
    dispatch(pasteCustomEvents());
    dispatch(
      addActor(sceneId, clipboardActor.x, clipboardActor.y, clipboardActor)
    );
  } else if (sceneId && clipboardData.__type === "trigger") {
    const clipboardTrigger = clipboardData.trigger;
    dispatch(pasteCustomEvents());
    dispatch(
      addTrigger(sceneId, clipboardTrigger.x, clipboardTrigger.y, clipboardTrigger.width, clipboardTrigger.height, clipboardTrigger)
    );
  }
};

export const pasteCustomEvents = () => {
  return { type: types.PASTE_CUSTOM_EVENTS };
};

export const setScriptTab = tab => {
  return { type: types.SET_SCRIPT_TAB, tab };
};

export const setScriptTabScene = tab => {
  return { type: types.SET_SCRIPT_TAB_SCENE, tab };
};

export const setScriptTabSecondary = tab => {
  return { type: types.SET_SCRIPT_TAB_SECONDARY, tab };
};

export const editUI = () => {
  return { type: types.EDIT_UI };
};

export const ejectEngine = () => {
  return { type: types.EJECT_ENGINE };
};

export const deleteBuildCache = () => {
  return { type: types.DELETE_BUILD_CACHE };
};

export const buildGame = ({
  buildType = "web",
  exportBuild = false,
  ejectBuild = false
} = {}) => async (dispatch, getState) => {
  const state = getState();
  if (!state.document.loaded || state.console.status === "running") {
    // Can't build while previous build still in progress
    // or loading project
    return;
  }
  dispatch({
    type: types.BUILD_GAME,
    buildType,
    exportBuild,
    ejectBuild
  });
};
